import { readFile } from 'node:fs/promises'
import type postgres from 'postgres'

export const CMS_STUB_SQL = new URL('../sql/cms-stub.sql', import.meta.url)

/** Creates the worker-facing subset of the `cms` schema in a throwaway test database. */
export async function createCmsStub(sql: postgres.Sql): Promise<void> {
  await sql.unsafe(await readFile(CMS_STUB_SQL, 'utf8'))
}
