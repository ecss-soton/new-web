import { relationship } from 'payload/dist/fields/validations'
import type { Validate } from 'payload/types'

import { getID } from '../../../utilities/getID'

export const includedForm: Validate = async (value, args) => {
  if (!args.payload) {
    return relationship(value, args)
  }
  const ticket = await args.payload.findByID({
    collection: 'tickets',
    id: getID(args.data.ticket),
    depth: 0,
  })

  const formSubmissionID = getID(value)

  if (!ticket.form && !formSubmissionID) {
    return relationship(value, args)
  }
  if (ticket.form && !formSubmissionID) {
    return 'Missing form submission'
  }

  if (!ticket.form && formSubmissionID) {
    return 'Ticket does not require a form submission'
  }

  const submission = await args.payload.findByID({
    collection: 'form-submissions',
    id: formSubmissionID,
    depth: 0,
  })

  if (ticket.form !== submission.form) {
    return 'Wrong form submission'
  }

  return relationship(value, args)
}
