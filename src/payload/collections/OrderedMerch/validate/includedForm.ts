import { Validate } from 'payload/types';
import { relationship } from 'payload/dist/fields/validations';
import { getID } from '../../../utilities/getID';

export const includedForm: Validate = async (value, args) => {
  if (!args.payload) {
    return relationship(value, args);
  }

  const merch = await args.payload.findByID(
    {
      collection: 'merch',
      id: getID(args.data.merch),
      depth: 0,
    },
  );

  const variationForm = merch.variations.find((v) => v.variation === args.data.variation)?.form;

  const formSubmissionID = getID(value);

  if (!variationForm && !formSubmissionID) {
    return relationship(value, args);
  }
  if (variationForm && !formSubmissionID) {
    return 'Missing form submission';
  }

  if (!variationForm && formSubmissionID) {
    return 'Merch does not require a form submission';
  }

  const submission = await args.payload.findByID({ collection: 'form-submissions', id: formSubmissionID, depth: 0 });

  if (variationForm !== submission.form) {
    return 'Wrong form submission';
  }

  return relationship(value, args);
};
