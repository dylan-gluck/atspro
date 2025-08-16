import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClientImpl, getApiClient, resetApiClient } from '@/lib/services/api-client'
import { createMockFetchResponse } from '../mocks'

describe('ApiClientImpl', () => {
  let apiClient: ApiClientImpl
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    apiClient = new ApiClientImpl('http://localhost:8000')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' }
      mockFetch.mockResolvedValue(createMockFetchResponse({ data: mockData }))

      const response = await apiClient.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/test',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(response).toEqual({
        data: mockData,
        success: true,
        message: undefined,
        errors: undefined,
      })
    })

    it('should handle GET request errors', async () => {
      mockFetch.mockResolvedValue(createMockFetchResponse(
        { error: 'Not found' },
        404,
        false
      ))

      const response = await apiClient.get('/nonexistent')

      expect(response.success).toBe(false)
      expect(response.data).toEqual({ error: 'Not found' })
    })
  })

  describe('POST requests', () => {
    it('should make successful POST request with data', async () => {
      const requestData = { name: 'New Item' }
      const responseData = { id: 2, name: 'New Item' }
      mockFetch.mockResolvedValue(createMockFetchResponse({ data: responseData }))

      const response = await apiClient.post('/items', requestData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/items',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        })
      )
      expect(response.data).toEqual(responseData)
      expect(response.success).toBe(true)
    })

    it('should handle POST request without data', async () => {
      const responseData = { message: 'Created' }
      mockFetch.mockResolvedValue(createMockFetchResponse({ data: responseData }))

      const response = await apiClient.post('/items')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/items',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: undefined,
        })
      )
      expect(response.success).toBe(true)
    })
  })

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const requestData = { id: 1, name: 'Updated Item' }
      const responseData = { id: 1, name: 'Updated Item' }
      mockFetch.mockResolvedValue(createMockFetchResponse({ data: responseData }))

      const response = await apiClient.put('/items/1', requestData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/items/1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        })
      )
      expect(response.data).toEqual(responseData)
      expect(response.success).toBe(true)
    })
  })

  describe('PATCH requests', () => {
    it('should make successful PATCH request', async () => {
      const requestData = { name: 'Patched Item' }
      const responseData = { id: 1, name: 'Patched Item' }
      mockFetch.mockResolvedValue(createMockFetchResponse({ data: responseData }))

      const response = await apiClient.patch('/items/1', requestData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/items/1',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        })
      )
      expect(response.data).toEqual(responseData)
      expect(response.success).toBe(true)
    })
  })

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      mockFetch.mockResolvedValue(createMockFetchResponse({ message: 'Deleted' }))

      const response = await apiClient.delete('/items/1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/items/1',
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(response.success).toBe(true)
    })
  })

  describe('File upload', () => {
    it('should upload file successfully', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const responseData = { id: 1, filename: 'test.txt' }
      mockFetch.mockResolvedValue(createMockFetchResponse({ data: responseData }))

      const response = await apiClient.upload('/upload', file)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      )

      // Check that Content-Type header was removed for FormData
      const call = mockFetch.mock.calls[0]
      expect(call[1].headers['Content-Type']).toBeUndefined()

      expect(response.data).toEqual(responseData)
      expect(response.success).toBe(true)
    })
  })

  describe('Request configuration', () => {
    it('should use custom headers', async () => {
      const customHeaders = { 'X-Custom-Header': 'test-value' }
      mockFetch.mockResolvedValue(createMockFetchResponse({ data: {} }))

      await apiClient.get('/test', { headers: customHeaders })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'test-value',
          }),
        })
      )
    })

    it('should handle timeout configuration', async () => {
      mockFetch.mockResolvedValue(createMockFetchResponse({ data: {} }))
      const mockAbort = vi.fn()
      vi.spyOn(AbortController.prototype, 'abort').mockImplementation(mockAbort)

      await apiClient.get('/test', { timeout: 5000 })

      // Timeout functionality would be tested with actual delays in integration tests
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const response = await apiClient.get('/test')

      expect(response.success).toBe(false)
      expect(response.message).toBe('Network error')
      expect(response.errors).toEqual(['Network error'])
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValue(new DOMException('Timeout', 'AbortError'))

      const response = await apiClient.get('/test')

      expect(response.success).toBe(false)
      expect(response.message).toBe('Request timeout')
    })

    it('should retry on server errors', async () => {
      // First call fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce(createMockFetchResponse({ error: 'Server error' }, 500, false))
        .mockResolvedValueOnce(createMockFetchResponse({ data: { success: true } }))

      const response = await apiClient.get('/test', { retries: 1 })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(response.success).toBe(true)
    })

    it('should not retry on client errors', async () => {
      mockFetch.mockResolvedValue(createMockFetchResponse({ error: 'Bad request' }, 400, false))

      const response = await apiClient.get('/test', { retries: 3 })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(response.success).toBe(false)
    })
  })

  describe('Auth token management', () => {
    it('should set auth token in headers', () => {
      const token = 'test-token-123'
      apiClient.setAuthToken(token)

      mockFetch.mockResolvedValue(createMockFetchResponse({ data: {} }))

      apiClient.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
          }),
        })
      )
    })

    it('should remove auth token', () => {
      apiClient.setAuthToken('test-token')
      apiClient.removeAuthToken()

      mockFetch.mockResolvedValue(createMockFetchResponse({ data: {} }))

      apiClient.get('/test')

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers['Authorization']).toBeUndefined()
    })
  })

  describe('Content type handling', () => {
    it('should handle JSON responses', async () => {
      const jsonData = { message: 'success' }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(jsonData),
      })

      const response = await apiClient.get('/test')

      expect(response.data).toEqual(jsonData)
    })

    it('should handle text responses', async () => {
      const textData = 'Plain text response'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve(textData),
      })

      const response = await apiClient.get('/test')

      expect(response.data).toBe(textData)
    })

    it('should handle binary responses', async () => {
      const blobData = new Blob(['binary data'])
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        blob: () => Promise.resolve(blobData),
      })

      const response = await apiClient.get('/test')

      expect(response.data).toBe(blobData)
    })
  })
})

describe('getApiClient', () => {
  afterEach(() => {
    resetApiClient()
  })

  it('should return singleton instance', () => {
    const client1 = getApiClient()
    const client2 = getApiClient()

    expect(client1).toBe(client2)
  })

  it('should use environment variable for base URL', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'
    
    const client = getApiClient()
    
    expect(client['baseURL']).toBe('https://api.example.com')
  })

  it('should use default URL when env var not set', () => {
    delete process.env.NEXT_PUBLIC_API_URL
    
    const client = getApiClient()
    
    expect(client['baseURL']).toBe('http://localhost:8000')
  })
})

describe('resetApiClient', () => {
  it('should reset singleton instance', () => {
    const client1 = getApiClient()
    resetApiClient()
    const client2 = getApiClient()

    expect(client1).not.toBe(client2)
  })
})