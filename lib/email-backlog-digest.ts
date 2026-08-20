import { sendTransactionalEmail } from '@/lib/brevo';
import { recordDashboardNotification } from '@/lib/dashboard-notifications';
import { buildEmailBacklog, type EmailBacklog, type EmailBacklogItem } from '@/lib/email-backlog';
import { getContactEmail } from '@/lib/env';

const DIGEST_ITEM_LIMIT = 25;
const leadsHref = '/resources/career-diagnostic/submissions?tab=leads&followUp=due';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://coachkagiso.co.za').replace(/\/$/, '');
}

export function buildBacklogDigestSubject(backlog: EmailBacklog) {
  const { overdue, dueToday } = backlog.counts;
  if (overdue > 0 && dueToday > 0) {
    return `${overdue} overdue and ${dueToday} due today - follow-up emails`;
  }
  if (overdue > 0) return `${overdue} overdue follow-up email${overdue === 1 ? '' : 's'}`;
  if (dueToday > 0) return `${dueToday} follow-up email${dueToday === 1 ? '' : 's'} due today`;
  return 'Follow-up emails due tomorrow';
}

function describeItem(item: EmailBacklogItem) {
  const stage = item.blocked ? item.blockedReason : `Next: ${item.stageLabel}`;
  return `${item.firstName} (${item.email}) - ${item.urgencyLabel} - ${item.sourceLabel} - ${stage}`;
}

function itemRow(item: EmailBacklogItem) {
  const tone = item.urgency === 'overdue' ? '#DC2626' : item.urgency === 'today' ? '#A16207' : '#6B7280';
  const stage = item.blocked
    ? `<span style="color:#8C7466;">${escapeHtml(item.blockedReason)}</span>`
    : escapeHtml(`Next: ${item.stageLabel}`);

  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #eaded5;">
      <div style="color:#142334;font:700 15px Arial,sans-serif;">${escapeHtml(item.firstName)}</div>
      <div style="margin-top:2px;color:#66727d;font:13px Arial,sans-serif;">${escapeHtml(item.email)} &middot; ${escapeHtml(item.sourceLabel)}</div>
      <div style="margin-top:4px;font:13px Arial,sans-serif;">${stage}</div>
    </td>
    <td style="padding:12px 0;border-bottom:1px solid #eaded5;text-align:right;vertical-align:top;">
      <span style="color:${tone};font:700 12px Arial,sans-serif;letter-spacing:1.2px;text-transform:uppercase;">${escapeHtml(item.urgencyLabel)}</span>
    </td>
  </tr>`;
}

function buildDigestHtml(backlog: EmailBacklog, items: EmailBacklogItem[]) {
  const { overdue, dueToday, dueTomorrow, sendable, blocked, total } = backlog.counts;
  const remaining = backlog.items.length - items.length;

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f1ed;color:#142334;font-family:Georgia,'Times New Roman',serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(
      `${overdue} overdue, ${dueToday} due today, ${dueTomorrow} due tomorrow.`,
    )}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1ed;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dccdc1;">
          <tr><td style="padding:34px 34px 12px;">
            <p style="margin:0 0 18px;color:#c5a58e;font:700 12px Arial,sans-serif;letter-spacing:2.4px;text-transform:uppercase;">Growth OS</p>
            <h1 style="margin:0;color:#142334;font-size:32px;line-height:1.1;font-weight:400;">Your follow-up backlog</h1>
            <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">
              ${escapeHtml(
                overdue > 0
                  ? `${overdue} follow-up email${overdue === 1 ? '' : 's'} ${overdue === 1 ? 'is' : 'are'} overdue, the oldest by ${backlog.oldestDaysOverdue} day${backlog.oldestDaysOverdue === 1 ? '' : 's'}.`
                  : 'Nothing is overdue. Here is what is coming up.',
              )}
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
              <tr>
                <td style="padding:14px 0;color:#7a858e;font:700 12px Arial,sans-serif;letter-spacing:1.6px;text-transform:uppercase;">Overdue</td>
                <td style="padding:14px 0;color:#142334;font:15px Arial,sans-serif;text-align:right;">${overdue}</td>
              </tr>
              <tr>
                <td style="padding:14px 0;color:#7a858e;font:700 12px Arial,sans-serif;letter-spacing:1.6px;text-transform:uppercase;">Due today</td>
                <td style="padding:14px 0;color:#142334;font:15px Arial,sans-serif;text-align:right;">${dueToday}</td>
              </tr>
              <tr>
                <td style="padding:14px 0;color:#7a858e;font:700 12px Arial,sans-serif;letter-spacing:1.6px;text-transform:uppercase;">Due tomorrow</td>
                <td style="padding:14px 0;color:#142334;font:15px Arial,sans-serif;text-align:right;">${dueTomorrow}</td>
              </tr>
              <tr>
                <td style="padding:14px 0;color:#7a858e;font:700 12px Arial,sans-serif;letter-spacing:1.6px;text-transform:uppercase;">Ready to schedule</td>
                <td style="padding:14px 0;color:#142334;font:15px Arial,sans-serif;text-align:right;">${sendable} of ${total}</td>
              </tr>
            </table>

            <h2 style="margin:28px 0 4px;color:#142334;font-size:22px;font-weight:400;">Who is waiting</h2>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items.map(itemRow).join('')}</table>
            ${remaining > 0 ? `<p style="margin:16px 0 0;color:#66727d;font:14px Arial,sans-serif;">And ${remaining} more in the dashboard.</p>` : ''}
            ${blocked > 0 ? `<p style="margin:16px 0 0;color:#8C7466;font:14px/1.7 Arial,sans-serif;">${blocked} lead${blocked === 1 ? ' needs' : 's need'} a manual decision before the next email can go out.</p>` : ''}

            <p style="margin:28px 0 0;">
              <a href="${escapeHtml(`${getSiteUrl()}${leadsHref}`)}" style="display:inline-block;background:#142334;color:#fff;padding:14px 24px;font:700 12px Arial,sans-serif;letter-spacing:1.4px;text-transform:uppercase;text-decoration:none;">Open the leads view</a>
            </p>
            <p style="margin:18px 0 0;color:#66727d;font:14px/1.7 Arial,sans-serif;">
              Or ask the Growth OS assistant to &ldquo;schedule the overdue emails&rdquo; and approve the batch in one click.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function buildDigestText(backlog: EmailBacklog, items: EmailBacklogItem[]) {
  const { overdue, dueToday, dueTomorrow, sendable, total } = backlog.counts;
  return [
    'Your follow-up backlog',
    '',
    `Overdue: ${overdue}`,
    `Due today: ${dueToday}`,
    `Due tomorrow: ${dueTomorrow}`,
    `Ready to schedule: ${sendable} of ${total}`,
    '',
    'Who is waiting:',
    ...items.map((item) => `- ${describeItem(item)}`),
    '',
    `Open the leads view: ${getSiteUrl()}${leadsHref}`,
    'Or ask the Growth OS assistant to schedule the overdue emails.',
  ].join('\n');
}

/**
 * Builds the backlog, emails Kagiso a digest, and drops a matching dashboard
 * notification. Returns without sending when there is nothing waiting.
 */
export async function sendEmailBacklogDigest({ force = false }: { force?: boolean } = {}) {
  const backlog = await buildEmailBacklog();
  const actionable = backlog.counts.overdue + backlog.counts.dueToday;

  if (actionable === 0 && !force) {
    return { sent: false, reason: 'Nothing is overdue or due today.', backlog };
  }

  const items = backlog.items.slice(0, DIGEST_ITEM_LIMIT);
  const subject = buildBacklogDigestSubject(backlog);

  await sendTransactionalEmail({
    to: [{ email: getContactEmail(), name: 'Coach Kagiso' }],
    subject,
    text: buildDigestText(backlog, items),
    html: buildDigestHtml(backlog, items),
  });

  await recordDashboardNotification({
    eventType: 'email_backlog_due',
    source: 'growth_os',
    title: subject,
    description:
      backlog.counts.overdue > 0
        ? `${backlog.counts.overdue} overdue, oldest by ${backlog.oldestDaysOverdue} day${backlog.oldestDaysOverdue === 1 ? '' : 's'}. ${backlog.counts.sendable} ready to schedule.`
        : `${backlog.counts.dueToday} due today. ${backlog.counts.sendable} ready to schedule.`,
    href: leadsHref,
    metadata: {
      overdue: backlog.counts.overdue,
      dueToday: backlog.counts.dueToday,
      dueTomorrow: backlog.counts.dueTomorrow,
      sendable: backlog.counts.sendable,
      blocked: backlog.counts.blocked,
      oldestDaysOverdue: backlog.oldestDaysOverdue,
    },
  });

  return { sent: true, subject, backlog };
}
