import {
  assertJournalTransition,
  newGenesisAdmissionJournalEntry,
} from './platformioGenesisAdmissionJournal';

describe('PlatformIO Genesis admission journal', () => {
  it('creates a durable entry from a prepared attempt', () => {
    const entry = newGenesisAdmissionJournalEntry(
      {
        idempotencyKey: 'IDEMP-001',
        proposalId: 'PROPOSAL-001',
        candidateRef: 'CANDIDATE-001',
        mutation: 'CREATE_CANONICAL_OBJECT',
        admissionDecisionRef: 'WARDEN-001',
        reservationRef: 'RESERVATION-001',
        state: 'PREPARED',
      },
      new Date('2026-09-26T06:00:00.000Z'),
    );

    expect(entry).toMatchObject({
      idempotencyKey: 'IDEMP-001',
      state: 'PREPARED',
      mutationEvidenceRecorded: false,
      verificationEvidenceRecorded: false,
      canonicalTruthEstablished: false,
    });
  });

  it('allows recovery transitions but blocks impossible terminal rewinds', () => {
    expect(() =>
      assertJournalTransition('PREPARED', 'MUTATED'),
    ).not.toThrow();
    expect(() =>
      assertJournalTransition('RECONCILIATION_REQUIRED', 'VERIFICATION_PENDING'),
    ).not.toThrow();
    expect(() =>
      assertJournalTransition('VERIFIED', 'PREPARED'),
    ).toThrow('INVALID_GENESIS_ADMISSION_JOURNAL_TRANSITION');
    expect(() =>
      assertJournalTransition('CLOSED_NO_EFFECT', 'MUTATED'),
    ).toThrow('INVALID_GENESIS_ADMISSION_JOURNAL_TRANSITION');
  });
});
