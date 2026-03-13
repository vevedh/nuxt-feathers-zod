// Nitro middleware: session
// Runs on every request (or conditionally based on route rules).

export default defineEventHandler(async (event) => {
  // Example: attach a request id
  // event.context.requestId = crypto.randomUUID()
})
