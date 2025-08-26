<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Card, CardContent, CardHeader } from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';

	const accordionItems = [
		'contact',
		'summary',
		'experience',
		'education',
		'certifications',
		'skills'
	];
</script>

<div class="container mx-auto p-6">
	<!-- Header skeleton -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<Skeleton class="mb-2 h-8 w-48" />
			<Skeleton class="h-4 w-64" />
		</div>
		<div class="flex gap-2">
			<Skeleton class="h-10 w-32" />
			<Skeleton class="h-10 w-32" />
			<Skeleton class="h-10 w-36" />
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Editor Column Skeleton -->
		<div class="space-y-4">
			<Accordion.Root value={accordionItems} type="multiple">
				{#each accordionItems as item}
					<Accordion.Item value={item}>
						<Accordion.Trigger disabled class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<Skeleton class="h-4 w-4" />
								<Skeleton class="h-4 w-32" />
							</div>
							<div class="flex gap-1">
								<Skeleton class="h-6 w-6" />
								<Skeleton class="h-6 w-6" />
							</div>
						</Accordion.Trigger>
						<Accordion.Content>
							<Card>
								<CardContent class="space-y-4 pt-6">
									<!-- Contact fields skeleton -->
									{#if item === 'contact'}
										<div>
											<Skeleton class="mb-2 h-4 w-20" />
											<Skeleton class="h-10 w-full" />
										</div>
										<div class="grid gap-4 sm:grid-cols-2">
											<div>
												<Skeleton class="mb-2 h-4 w-16" />
												<Skeleton class="h-10 w-full" />
											</div>
											<div>
												<Skeleton class="mb-2 h-4 w-16" />
												<Skeleton class="h-10 w-full" />
											</div>
										</div>
										<div>
											<Skeleton class="mb-2 h-4 w-20" />
											<Skeleton class="h-10 w-full" />
										</div>
										<!-- Summary skeleton -->
									{:else if item === 'summary'}
										<Skeleton class="h-24 w-full" />
										<!-- Experience skeleton -->
									{:else if item === 'experience'}
										<Skeleton class="h-10 w-full" />
										<Card>
											<CardHeader>
												<Skeleton class="h-5 w-48" />
											</CardHeader>
											<CardContent class="space-y-4">
												<div class="grid gap-4 sm:grid-cols-2">
													<Skeleton class="h-10 w-full" />
													<Skeleton class="h-10 w-full" />
												</div>
												<div class="grid gap-4 sm:grid-cols-2">
													<Skeleton class="h-10 w-full" />
													<Skeleton class="h-10 w-full" />
												</div>
												<Skeleton class="h-16 w-full" />
											</CardContent>
										</Card>
										<!-- Education skeleton -->
									{:else if item === 'education'}
										<Skeleton class="h-10 w-full" />
										<Card>
											<CardHeader>
												<Skeleton class="h-5 w-48" />
											</CardHeader>
											<CardContent class="space-y-4">
												<Skeleton class="h-10 w-full" />
												<div class="grid gap-4 sm:grid-cols-2">
													<Skeleton class="h-10 w-full" />
													<Skeleton class="h-10 w-full" />
												</div>
											</CardContent>
										</Card>
										<!-- Certifications skeleton -->
									{:else if item === 'certifications'}
										<Skeleton class="h-10 w-full" />
										<Card>
											<CardHeader>
												<Skeleton class="h-5 w-48" />
											</CardHeader>
											<CardContent class="space-y-4">
												<Skeleton class="h-10 w-full" />
												<Skeleton class="h-10 w-full" />
											</CardContent>
										</Card>
										<!-- Skills skeleton -->
									{:else if item === 'skills'}
										<div class="flex gap-2">
											<Skeleton class="h-10 flex-1" />
											<Skeleton class="h-10 w-20" />
										</div>
										<div class="flex flex-wrap gap-2">
											{#each Array(6) as _}
												<Skeleton class="h-7 w-20 rounded-full" />
											{/each}
										</div>
									{/if}
								</CardContent>
							</Card>
						</Accordion.Content>
					</Accordion.Item>
				{/each}
			</Accordion.Root>
		</div>

		<!-- Preview Column Skeleton (Desktop) -->
		<div class="hidden lg:block">
			<div class="sticky top-4">
				<Card class="h-[calc(100vh-8rem)] overflow-auto">
					<CardHeader>
						<Skeleton class="mb-2 h-6 w-32" />
						<Skeleton class="h-4 w-48" />
					</CardHeader>
					<CardContent>
						<!-- Contact preview skeleton -->
						<div class="mb-6 text-center">
							<Skeleton class="mx-auto mb-2 h-8 w-48" />
							<div class="flex flex-wrap justify-center gap-3">
								<Skeleton class="h-4 w-32" />
								<Skeleton class="h-4 w-28" />
								<Skeleton class="h-4 w-40" />
							</div>
						</div>

						<Skeleton class="mb-6 h-px w-full" />

						<!-- Summary preview skeleton -->
						<div class="mb-6">
							<Skeleton class="mb-2 h-5 w-40" />
							<Skeleton class="mb-1 h-4 w-full" />
							<Skeleton class="mb-1 h-4 w-full" />
							<Skeleton class="h-4 w-3/4" />
						</div>

						<Skeleton class="mb-6 h-px w-full" />

						<!-- Experience preview skeleton -->
						<div class="mb-6">
							<Skeleton class="mb-3 h-5 w-36" />
							{#each Array(2) as _}
								<div class="mb-4">
									<div class="mb-2 flex justify-between">
										<div>
											<Skeleton class="mb-1 h-4 w-32" />
											<Skeleton class="h-3 w-24" />
										</div>
										<Skeleton class="h-3 w-20" />
									</div>
									<Skeleton class="mb-1 h-3 w-full" />
									<Skeleton class="h-3 w-4/5" />
								</div>
							{/each}
						</div>

						<Skeleton class="mb-6 h-px w-full" />

						<!-- Skills preview skeleton -->
						<div>
							<Skeleton class="mb-3 h-5 w-16" />
							<div class="flex flex-wrap gap-2">
								{#each Array(8) as _}
									<Skeleton class="h-6 w-20 rounded-full" />
								{/each}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</div>
</div>
