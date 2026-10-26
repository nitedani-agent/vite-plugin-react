import { expect, test } from '@playwright/test'
import { setupInlineFixture, useFixture } from './fixture'

test.describe('setOnClientReferenceLoad', () => {
  const root = 'examples/e2e/temp/ssr-client-reference-load'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'src/root.tsx': /* tsx */ `
          import { Suspense } from 'react'
          import { TestClient } from './client.tsx'

          export function Root() {
            return (
              <html lang="en">
                <body>
                  <Suspense fallback={<p>test-fallback</p>}>
                    <TestClient />
                  </Suspense>
                </body>
              </html>
            )
          }
        `,
        'src/client.tsx': /* tsx */ `
          "use client";

          export function TestClient() {
            return <p>test-client</p>
          }
        `,
        'src/framework/entry.ssr.tsx': /* tsx */ `
          import {
            createFromReadableStream,
            setOnClientReferenceLoad,
          } from '@vitejs/plugin-rsc/ssr'
          import { AsyncLocalStorage } from 'node:async_hooks'
          import { renderToReadableStream } from 'react-dom/server.edge'
          import type { RscPayload } from './entry.rsc'

          const loadsStorage = new AsyncLocalStorage<Promise<unknown>[]>()
          setOnClientReferenceLoad(({ promise }) => {
            loadsStorage.getStore()?.push(promise)
          })

          export async function renderHTML(rscStream: ReadableStream<Uint8Array>) {
            const loads: Promise<unknown>[] = []
            const payload = await loadsStorage.run(loads, () =>
              createFromReadableStream<RscPayload>(rscStream),
            )
            await Promise.all(loads)
            return { stream: await renderToReadableStream(payload.root) }
          }
        `,
      },
    })
  })

  function defineTest(mode: 'dev' | 'build') {
    const f = useFixture({ root, mode })

    test('client component renders in the shell on the first request', async ({
      request,
    }) => {
      const response = await request.get(f.url())
      const html = await response.text()
      expect(html).toContain('<p>test-client</p>')
      expect(html).not.toContain('test-fallback')
    })
  }

  test.describe('dev', () => defineTest('dev'))
  test.describe('build', () => defineTest('build'))
})
