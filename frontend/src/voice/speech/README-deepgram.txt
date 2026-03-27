ShelfSafe Deepgram notes

- This build uses native browser WebSocket only.
- The backend mints a temporary Deepgram token through /v1/auth/grant.
- The frontend authenticates the websocket with Sec-WebSocket-Protocol using a bearer token.
- The Deepgram browser SDK is intentionally disabled to avoid browser-incompatible ws imports.
