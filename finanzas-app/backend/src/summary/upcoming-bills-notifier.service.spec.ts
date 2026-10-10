import { UpcomingBillsNotifierService } from './upcoming-bills-notifier.service';

describe('UpcomingBillsNotifierService recipients', () => {
  const HOUSE_ID = 'house-1';
  const bill = { type: 'debt', name: 'Visa', dueDate: '2026-10-12', daysUntilDue: 2, amount: 50 };

  function build(adminEmails: string[], created: object | null) {
    const sendBudgetAlert = jest.fn().mockResolvedValue(true);
    const service = new UpcomingBillsNotifierService(
      { findAll: jest.fn().mockResolvedValue([{ id: HOUSE_ID }]), getHouseAdminEmails: jest.fn().mockResolvedValue(adminEmails) } as any,
      { getUpcomingBills: jest.fn().mockResolvedValue([bill]) } as any,
      { sendBudgetAlert } as any,
      { createIfNotRecent: jest.fn().mockResolvedValue(created) } as any,
    );
    return { service, sendBudgetAlert };
  }

  beforeEach(() => {
    process.env.SMTP_USER = 'smtp-user@example.com';
  });

  it('emails each house admin and never SMTP_USER', async () => {
    const { service, sendBudgetAlert } = build(['a1@x.com', 'a2@x.com'], { id: 'n1' });
    await service.checkUpcomingBills();
    expect(sendBudgetAlert.mock.calls.map((c) => c[0])).toEqual(['a1@x.com', 'a2@x.com']);
  });

  it('sends nothing when the house has no admins', async () => {
    const { service, sendBudgetAlert } = build([], { id: 'n1' });
    await service.checkUpcomingBills();
    expect(sendBudgetAlert).not.toHaveBeenCalled();
  });

  it('sends nothing when the notification was deduplicated', async () => {
    const { service, sendBudgetAlert } = build(['a1@x.com'], null);
    await service.checkUpcomingBills();
    expect(sendBudgetAlert).not.toHaveBeenCalled();
  });
});
