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
    .cta-btn { display: inline-block; margin-top: 24px; background: #2D7A5F; color: #FFFFFF !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 50px; }
    .divider { border: none; border-top: 1px solid #EDE8DF; margin: 24px 0; }
    .footer { text-align: center; padding-top: 28px; font-size: 12px; color: #9A9080; line-height: 1.6; }
  </style>
`;

export const inactivityEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>We Miss You</title>
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
      <span class="emoji-icon">🌊</span>
      <h1>The pod's been quiet without you</h1>
      <p>It's been a while since you last joined an event. There are pods forming near you right now — coffee meetups, hikes, social nights.</p>
      <hr class="divider" />
      <p>Open the app to see what's happening around you. Your next adventure is closer than you think.</p>
      <a href="#" class="cta-btn">See what's nearby</a>
    </div>
    <div class="footer">
      <p>You're receiving this because you have an Orca account.</p>
      <p>© ${new Date().getFullYear()} Orca Events · All rights reserved</p>
    </div>
  </div>
</body>
</html>
`;
