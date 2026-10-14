import type { CollectionAfterChangeHook } from 'payload'
import { OutboxTopics } from '@fp/contracts'
import { appendOutbox, type OutboxWrite } from '@/lib/payload-tx'
import { relIds } from './snapshot'

/**
 * Emits domain events for contact edits (ADR-0006): segment recompute, and sequence triggers for
 * newly added tags/lists (FR-EML-2). Runs in the edit's transaction via the outbox.
 */
export const contactChanged: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  if (req.context?.skipContactEvents) return doc
  const contactId = String(doc.id)
  const rows: OutboxWrite[] = [
    { topic: OutboxTopics.contactChanged, key: contactId, payload: { contactId } },
  ]
  const prevTags = new Set(operation === 'update' ? relIds(previousDoc?.tags) : [])
  const prevLists = new Set(operation === 'update' ? relIds(previousDoc?.lists) : [])
  for (const tagId of relIds(doc.tags).filter((t) => !prevTags.has(t)))
    rows.push({
      topic: OutboxTopics.sequenceTrigger,
      key: contactId,
      payload: { contactId, trigger: { type: 'tag_added', tagId } },
    })
  for (const listId of relIds(doc.lists).filter((l) => !prevLists.has(l)))
    rows.push({
      topic: OutboxTopics.sequenceTrigger,
      key: contactId,
      payload: { contactId, trigger: { type: 'list_joined', listId } },
    })
  await appendOutbox(req, rows)
  return doc
}
