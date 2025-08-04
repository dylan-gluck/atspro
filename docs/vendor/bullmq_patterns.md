# Adding jobs in bulk across different queues

Sometimes it is necessary to atomically add jobs to different queues in bulk. For example, there could be a requirement that all the jobs must be created or none of them. Also, adding jobs in bulk can be faster, since it reduces the number of roundtrips to Redis:

You may be think of [`queue.addBulk`](https://api.docs.bullmq.io/classes/v5.Queue.html#addBulk), but this method only adds jobs to a single queue. Another option is [`flowProducer.addBulk`](https://api.docs.bullmq.io/classes/v5.FlowProducer.html#addBulk), so let's see an example:

```typescript
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer({ connection });

const trees = await flow.addBulk([
  {
    name: 'job-1',
    queueName: 'queueName-1',
    data: {}
  },
  {
    name: 'job-2',
    queueName: 'queueName-2',
    data: {}
  },
]);
```

It is possible to add individual jobs without children.

This call can only succeed or fail, and all or none of the jobs will be added.

## Read more:

* 💡 [Add Bulk API Reference](https://api.docs.bullmq.io/classes/v5.FlowProducer.html#addBulk)

---

# Manually processing jobs

When a Worker is instantiated, the most common usage is to specify a process function so that the worker will automatically process the jobs that arrive to the queue.

Sometimes however it is useful to be able to fetch the jobs manually. Just instantiate the worker without a processor and call getNextJob to fetch the next job:

```typescript
const worker = new Worker('my-queue');

// Specify a unique token
const token = 'my-token';

const job = (await worker.getNextJob(token)) as Job;

// Access job.data and do something with the job
// processJob(job.data)
if (succeeded) {
  await job.moveToCompleted('some return value', token, false);
} else {
  await job.moveToFailed(new Error('my error message'), token, false);
}

await worker.close();
```

There is an important consideration regarding job "locks" when processing manually. Locks prevent workers from fetching a job that is already being processed by another worker. The ownership of the lock is determined by the "token" that is sent when getting the job.

{% hint style="info" %}
the lock duration setting is called "visibility window" in other queue systems.
{% endhint %}

Normally a job gets locked as soon as it is fetched from the queue with a max duration of the specified `lockDuration` worker option. The default is 30 seconds but can be changed to any value easily. For example, to change it to 60 seconds:

```typescript
const worker = new Worker('my-queue', null, { lockDuration: 60000 });
```

When using standard worker processors, the lock is renewed automatically after half the lock duration time has passed. However, this mechanism does not exist when processing jobs manually, so to avoid the job being moved back to the waiting list of the queue,\
you need to make sure to process the job faster than the `lockDuration`, or manually extend the lock:

```typescript
const job = (await worker.getNextJob(token)) as Job;

// Extend the lock 30 more seconds
await job.extendLock(token, 30000);
```

### Choosing a token

A token represents ownership by given worker currently working on a given job. If the worker dies unexpectedly, the job could be picked up by another worker when the lock expires. A good approach for generating tokens for jobs is simply to generate a UUID for every new job, but it all depends on your specific use case.

## Checking for stalled jobs

When processing jobs manually you may also want to start the stalled jobs checker. This checker is needed to move stalled jobs (whose lock has expired) back to the _wait_ status (or _failed_ if they have exhausted the maximum number of [stalled attempts](https://api.docs.bullmq.io/interfaces/v5.WorkerOptions.html#maxStalledCount), which is 1 by default).

```typescript
await worker.startStalledCheckTimer()
```

The checker will run periodically (based on the [`stalledInterval`](https://api.docs.bullmq.io/interfaces/v5.WorkerOptions.html#stalledInterval) option) until the worker is closed.

## Looping through jobs

In many cases, you will have an "infinite" loop that processes jobs one by one like the following example. Note that the third parameter in `job.moveToCompleted`/`job.moveToFailed` is not used, signalling that the next job should be returned automatically.

```typescript
const worker = new Worker('my-queue');

const token = 'my-token';
let job;

while (1) {
  let jobData = null,
    jobId,
    success;

  if (job) {
    // Use job.data to process this particular job.
    // and set success variable if succeeded

    if (success) {
      [jobData, jobId] = await job.moveToCompleted('some return value', token);
    } else {
      await job.moveToFailed(new Error('some error message'), token);
    }

    if (jobData) {
      job = Job.fromJSON(worker, jobData, jobId);
    } else {
      job = null;
    }
  } else {
    if (!job) {
      job = await worker.getNextJob(token);
    }
  }
}
```

## Rate Limiting

If you want to move a job back to wait because your queue is rate limited.

```typescript
const worker = new Worker('my-queue', null, { connection, prefix });
const token = 'my-token';
await Job.create(queue, 'test', { foo: 'bar' });
const job = (await worker.getNextJob(token)) as Job;

await queue.rateLimit(60000);
await job.moveToWait(token);
```

## Read more:

* 💡 [Get Next Job API Reference](https://api.docs.bullmq.io/classes/v5.Worker.html#getNextJob)
* 💡 [Move To Completed API Reference](https://api.docs.bullmq.io/classes/v5.Job.html#moveToCompleted)
* 💡 [Move To Failed API Reference](https://api.docs.bullmq.io/classes/v5.Job.html#moveToFailed)
* 💡 [Move To Wait API Reference](https://api.docs.bullmq.io/classes/v5.Job.html#moveToWait)

---

# Failing fast when Redis is down

By design, BullMQ reconnects to Redis automatically. If jobs are added to a queue while the queue instance is disconnected from Redis, the `add` command will not fail; instead, the call will keep waiting for a reconnection to occur until it can complete.

This behavior is not always desirable; for example, if you have implemented a REST API that results in a call to `add`, you do not want to keep the HTTP call busy while `add` is waiting for the queue to reconnect to Redis. In this case, you can pass the option `enableOfflineQueue: false`, so that `ioredis` do not queue the commands and instead throws an exception:

```typescript
const myQueue = new Queue("transcoding", {
  connection: {
    enableOfflineQueue: false,
  },
});

app.post("/jobs", async (req, res) => {
  try {
    const job = await myQueue.add("myjob", { req.body });
    res.status(201).json(job.id);
  }catch(err){
    res.status(503).send(err);
  }
})
```

Using this approach, the caller can catch the exception and act upon it depending on its requirements (for example, retrying the call or giving up).

{% hint style="danger" %}
Currently, there is a limitation in that the Redis instance must at least be online while the queue is being instantiated.
{% endhint %}

---

# Persistent connections

A crucial feature for a subsystem in a microservice architecture is that it should automatically handle disconnections from other services and keep these connections alive for as long as the service is running.

For example, if your service has a connection to a database, and the connection to said database breaks, you would like that service to handle this disconnection as gracefully as possible and as soon as the database is back online continue to work without human intervention.

Since Bull relies on **ioredis** for accessing Redis, the default is auto-reconnect forever. This behaviour can be customized but most likely the default is the best setting currently: [https://github.com/luin/ioredis#auto-reconnect](https://github.com/luin/ioredis#auto-reconnect)

In the context of Bull, we have normally two different cases that are handled differently.

### Workers

A worker is consuming jobs from the queue as fast as it can. If it loses the connection to Redis we want the worker to "wait" until Redis is available again. For this to work we need to understand an important setting in our Redis options (which are handled by ioredis):

#### `maxRetriesPerRequest`

This setting tells the ioredis client how many times to try a command that fails before throwing an error. So even though Redis is not reachable or offline, the command will be retried until this situation changes or the maximum number of attempts is reached.

In Bull we set this setting to null both for the "bclient" and "eclient" connections, which are used for the workers and events respectively.

This guarantees that the workers will keep processing forever as long as there is a working connection. If you create a Redis client manually, Bull will throw an exception if this setting is not set to null.

### Queue

A simple Queue instance used for managing the queue such as adding jobs, pausing, using getters, etc. usually has different requirements from the worker.

For example, say that you are adding jobs to a queue as the result of a call to an HTTP endpoint. The caller of this endpoint cannot wait forever if the connection to Redis happens to be down when this call is made.

Therefore the `maxRetriesPerRequest` setting should either be left at its default (which currently is 20) or set it to another value, maybe 1 so that the user gets an error quickly and can retry later.

---

# Message queue

Bull can also be used for persistent message queues. This is a quite useful feature in some use cases. For example, you can have two servers that need to communicate with each other. By using a queue, the servers do not need to be online at the same time, so this creates a very robust communication channel. You can treat `add` as _send_ and `process` as _receive_:

Server A:

```typescript
const Queue = require('bull');

const sendQueue = new Queue('Server B');
const receiveQueue = new Queue('Server A');

receiveQueue.process(function (job, done) {
  console.log('Received message', job.data.msg);
  done();
});

sendQueue.add({ msg: 'Hello' });
```

Server B:

```typescript
const Queue = require('bull');

const sendQueue = new Queue('Server A');
const receiveQueue = new Queue('Server B');

receiveQueue.process(function (job, done) {
  console.log('Received message', job.data.msg);
  done();
});

sendQueue.add({ msg: 'World' });
```

---

# Returning Job Completions

A common pattern is where you have a cluster of queue processors that just process jobs as fast as they can, and some other services that need to take the result of these processors and do something with it, maybe storing results in a database.

The most robust and scalable way to accomplish this is by combining the standard job queue with the message queue pattern: a service sends jobs to the cluster just by opening a job queue and adding jobs to it, and the cluster will start processing as fast as it can. Everytime a job gets completed in the cluster a message is sent to a results message queue with the result data, and this queue is listened by some other service that stores the results in a database.

---

# Reusing Redis Connections

A standard queue requires **3 connections** to the Redis server. In some situations you might want to re-use connections—for example on Heroku where the connection count is restricted. You can do this with the `createClient` option in the `Queue` constructor.

#### Notes:

* bclient connections [cannot be re-used](https://github.com/OptimalBits/bull/issues/880), so you should return a new connection each time this is called.
* client and subscriber connections can be shared and will not be closed when the queue is closed. When you are shutting down the process, first close the queues, then the shared connections (if they are shared).
* if you are not sharing connections but still using `createClient` to do some custom connection logic, you may still need to keep a list of all the connections you created so you can manually close them later when the queue shuts down, if you need a graceful shutdown for your process
* do not set a `keyPrefix` on the connection you create, use bull's built-in prefix feature if you need a key prefix

```typescript
const { REDIS_URL } = process.env;

const Redis = require("ioredis");
const client = new Redis(REDIS_URL);
const subscriber = new Redis(REDIS_URL);

const opts = {
  // redisOpts here will contain at least a property of
  // connectionName which will identify the queue based on its name
  createClient: function (type, redisOpts) {
    switch (type) {
      case "client":
        return client;
      case "subscriber":
        return subscriber;
      case "bclient":
        return new Redis(REDIS_URL, redisOpts);
      default:
        throw new Error("Unexpected connection type: ", type);
    }
  },
};

const queueFoo = new Queue("foobar", opts);
const queueQux = new Queue("quxbaz", opts);
```

---

# Manually fetching jobs

If you want to manually fetch the jobs from the queue instead of letting the automatic processor taking care of it, this pattern is for you.

Manually transitioning states for jobs can be done with a few simple methods.

1. Adding a job to the 'waiting' queue. Grab the queue and call `add`.

```typescript
import Queue from 'bull';

const queue = new Queue({
  limiter: {
    max: 5,
    duration: 5000,
    bounceBack: true // important
  },
  ...queueOptions
});
queue.add({ random_attr: 'random_value' });
```

1. Pulling a job from 'waiting' and moving it to 'active'.

```typescript
const job: Job = await queue.getNextJob();
```

1. Move the job to the 'failed' queue if something goes wrong.

```typescript
const (nextJobData, nextJobId) = await job.moveToFailed(
  {
    message: 'Call to external service failed!',
  },
  true,
);
```

1. Move the job to the 'completed' queue.

```typescript
const (nextJobData, nextJobId) = await job.moveToCompleted('succeeded', true);
```

1. Return the next job if one is returned.

```typescript
if (nextJobdata) {
  return Job.fromJSON(queue, nextJobData, nextJobId);
}
```

**Note**

By default the lock duration for a job that has been returned by `getNextJob` or `moveToCompleted` is 30 seconds. If it takes more time than that the job will be automatically marked as stalled and depending on the max stalled options be moved back to the wait state or marked as failed. In order to avoid this you must use `job.extendLock(duration)` in order to give you some more time before the lock expires. It is recommended to extend the lock when half the lock time has passsed.
