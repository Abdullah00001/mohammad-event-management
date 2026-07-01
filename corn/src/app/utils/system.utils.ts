import { TMailOption } from '@/app/@types/system.types';

export function mailOption(
  to: string,
  subject: string,
  html: string
): TMailOption {
  const option: TMailOption = {
    from: process.env.SMTP_USER as string,
    to,
    subject,
    html,
  };
  return option;
}
