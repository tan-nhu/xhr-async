import xhr, { RequestRef } from './xhr-async'
import test from 'ava'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test('defaults', async t => {
  t.truthy(xhr.defaults)
})

test('should not raise exception when server is not found', async t => {
  try {
    const { data, status, error, statusText } = await xhr.get('https://notavalidurl.com1/')
    t.is(status, 0)
  } catch (error) {
    t.fail('request should not raise exception, ever.')
  }
})

test('status code should be legit', async t => {
  const code = 418
  const { data, status, error, statusText } = await xhr.get('https://httpbin.org/status/' + code)

  t.is(status, code)
})

test('baseURL should work', async t => {
  xhr.defaults.baseURL = 'https://httpbin.org'
  const { data, status } = await xhr.get('/ip')

  t.is(status, 200)
})

test('status code 200', async t => {
  const { data, status } = await xhr.get('https://httpbin.org')
  t.is(status, 200)
})

test('should set header correctly with before()', async t => {
  const bearer = 'Bearer 1234'

  xhr.before(({ headers = {} }) => {
    headers.Authorization = bearer
  })

  const { data, status, request } = await xhr.get('https://httpbin.org/headers')

  t.is(status, 200)
  t.is(data.headers.Authorization, bearer)

  if (request && request.headers) {
    t.is(request.headers.Authorization, bearer)
  } else {
    t.fail('request.headers must be set and returned properly')
  }
})

test('should set request object properly', async t => {
  let request

  const { data, status } = await xhr.get('https://httpbin.org/', {
    ref: req => request = req
  })

  t.is(status, 200)
  t.is(request, undefined) // xhr should be unset to undefined after the request
})

test('ref should not be null during the request', async t => {
  let rootRequest

  const response = xhr.get('https://httpbin.org/delay/2', {
    ref: req => rootRequest = req
  })

  await sleep(1)

  t.truthy(rootRequest) // during the request ie being made, xhr should be set

  const { status } = await response

  t.is(status, 200)
  t.is(rootRequest, undefined) // when the request is fulfilled, xhr should be unset
})

test('ref.abort() should work', async t => {
  let rootReq: RequestRef

  const response = xhr.get('https://httpbin.org/delay/2', {
    ref: req => rootReq = req
  })

  await sleep(1)

  t.truthy(rootReq) // during the request is being made, xhr should be set

  if (rootReq) {
    rootReq.abort()
  }

  const { status, ...others } = await response

  t.is(status, 0)
  t.is(rootReq, undefined) // abort() should also unset xhr
})

test('should unset ref when an exception happens', async t => {
  let rootReq
  const { data, status, error, statusText } = await xhr.get('https://notavalidurl.com1/', {
    ref: req => rootReq = req
  })

  t.is(status, 0)
  t.is(rootReq, undefined)
})

test('xhr.group should work', async t => {
  const group = 'httpbin'
  let request

  const response = xhr.get('https://httpbin.org/delay/2', {
    group: group,
    ref: req => request = req
  })

  await sleep(1) // wait a bit to initialize the request

  t.truthy(request) // during the request is being made, xhr should be set

  xhr.abort(group) // abort the whole group

  const { status } = await response

  t.is(status, 0)
  t.is(request, undefined) // abort() from xhr.abort(group) should also unset xhr
})

test('xhr.retry', async t => {
  const group = 'httpbin'
  let request: RequestRef

  const response = xhr.get('https://httpbin.org/delay/2', {
    retry: 1,
    ref: req => request = req
  })

  await sleep(1) // wait a bit to initialize the request

  // Terminate the request, another attempt should be made
  if (request) {
    request.abort()
  }

  const { status, data } = await response

  t.is(status, 200)
  t.truthy(data)
  t.truthy(data.headers)
})