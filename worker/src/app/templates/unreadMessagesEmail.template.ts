const baseStyles = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #F5F0E8; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1A1A1A; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 0 16px 40px; }
    .header { text-align: center; padding: 32px 0 24px; }
    .orca-icon { font-size: 40px; display: block; margin-bottom: 8px; }
    .brand { font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #4B3C2A; }
    .card { background: #FFFFFF; border-radius: 16px; padding: 36px 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .wave { width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #2D7A5F 0%, #4B9E7A 50%, #2D7A5F 100%); margin-bottom: 28px; }
    .emoji-icon { font-size: 36px; margin-bottom: 16px; display: block; }
    h1 { font-size: 22px; font-weight: 600; color: #1A1A1A; line-height: 1.3; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.65; color: #4A4A4A; margin-bottom: 10px; }
    .count-block { background: #F5F0E8; border-radius: 12px; padding: 20px 24px; margin: 20px 0; text-align: center; }
    .count-number { font-size: 42px; font-weight: 600; color: #2D7A5F; line-height: 1; margin-bottom: 4px; }
    .count-label { font-size: 13px; color: #4B3C2A; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; }
    .cta-btn { display: inline-block; margin-top: 24px; background: #2D7A5F; color: #FFFFFF !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 50px; }
    .footer { text-align: center; padding-top: 28px; font-size: 12px; color: #9A9080; line-height: 1.6; }
  </style>
`;

export const unreadMessagesEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unread Messages</title>
  ${baseStyles}
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="orca-icon">🐋</span>
      <span class="brand">Orca Events</span>
    </div>
    <div class="card">
      <div class="wave"></div>
      <span class="emoji-icon">💬</span>
      <h1>Your orcas are talking</h1>
      <div class="count-block">
        <div class="count-number">{{unreadCount}}</div>
        <div class="count-label">unread conversations</div>
      </div>
      <p>Don't leave them on read. Your pod chats and connections have new messages waiting.</p>
      <a href="#" class="cta-btn">Read messages</a>
    </div>
    <div class="footer">
      <p>You're receiving this because you have an Orca account.</p>
      <p>© ${new Date().getFullYear()} Orca Events · All rights reserved</p>
    </div>
  </div>
</body>
</html>
`;
