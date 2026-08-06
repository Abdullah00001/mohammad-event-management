export const accountStatusUpdateEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Status Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: {{#if isBlocked}}#DC2626{{else}}#059669{{/if}}; border-radius: 8px 8px 0 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center;">
                                        <!-- Icon -->
                                        <div style="display: inline-block; background-color: #ffffff; border-radius: 50%; width: 60px; height: 60px; margin-bottom: 20px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" height="60">
                                                <tr>
                                                    <td style="text-align: center; vertical-align: middle;">
                                                        <span style="color: {{#if isBlocked}}#DC2626{{else}}#059669{{/if}}; font-size: 36px; font-weight: bold;">
                                                            {{#if isBlocked}}&#9888;{{else}}&#10004;{{/if}}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center;">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Account Status Update</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 24px;">
                                Hello,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                                {{#if isBlocked}}
                                We are writing to inform you that your account has been <strong>suspended</strong>. This action was taken by an administrator.
                                {{else}}
                                Great news! Your account has been <strong>reactivated</strong> by an administrator. You can now log back into the app.
                                {{/if}}
                            </p>
                            
                            <!-- Status Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                                <tr>
                                    <td style="background-color: {{#if isBlocked}}#fef2f2{{else}}#d1fae5{{/if}}; border-left: 4px solid {{#if isBlocked}}#DC2626{{else}}#059669{{/if}}; padding: 20px; border-radius: 4px;">
                                        <p style="margin: 0 0 10px 0; color: {{#if isBlocked}}#991b1b{{else}}#065f46{{/if}}; font-size: 16px; line-height: 22px; font-weight: bold;">
                                            New Status: {{status}}
                                        </p>
                                        <p style="margin: 0; color: {{#if isBlocked}}#991b1b{{else}}#065f46{{/if}}; font-size: 14px; line-height: 20px;">
                                            {{#if isBlocked}}
                                            You will no longer be able to access your account or use our services. If you believe this is an error, please contact our support team.
                                            {{else}}
                                            You now have full access to your account and all associated features. Welcome back!
                                            {{/if}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 20px; text-align: center;">
                                This email was sent to <a href="mailto:{{email}}" style="color: #059669; text-decoration: none;">{{email}}</a>
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 12px; line-height: 18px; text-align: center;">
                                &copy; 2026 NowOr. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
