import { date as validateDate } from 'payload/dist/fields/validations';
import type { Validate } from 'payload/types';

function moreThanDaysAway(start: Date, end: Date, days: number): boolean {
  const diff = end.getTime() - start.getTime();
  const duration = days * 24 * 60 * 60 * 1000;
  return diff >= duration;
}

// Nominations must last at least 10 days
export const isNominationConstitutional: Validate = (date: string, args) => {
  if (!args.data.nominationStart) {
    return 'Nomination start should be selected.';
  }
  const nominationStart = new Date(Date.parse(args.data.nominationStart));
  const nominationEnd = new Date(Date.parse(date));
  if (moreThanDaysAway(nominationStart, nominationEnd, 10)) {
    return validateDate(date, args);
  }
  return 'The date selected must be more than 10 days from the nomination start.';
};

export const isAfterNomination: Validate = (date: string, args) => {
  if (!args.data.nominationEnd) {
    return 'Nomination end must be selected.';
  }
  const nominationEnd = new Date(Date.parse(args.data.nominationEnd));
  const votingStart = new Date(Date.parse(date));
  if (votingStart > nominationEnd) {
    return validateDate(date, args);
  }
  return 'The date selected must be after the nomination ends.';
};

// Voting must last at least 7 days
export const isVotingConstitutional: Validate = (date: string, args) => {
  if (!args.data.votingStart) {
    return 'Voting end must be selected.';
  }
  const votingStart = new Date(Date.parse(args.data.votingStart));
  const votingEnd = new Date(Date.parse(date));
  if (moreThanDaysAway(votingStart, votingEnd, 7)) {
    return validateDate(date, args);
  }
  return 'The date selected must be more than 7 days from the voting end.';
};
