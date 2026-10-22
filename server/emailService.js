// server/emailService.js - Email Notification System for Ghar Ki Rasoi
const nodemailer = require('nodemailer');

// In-memory log of sent emails so frontend can inspect received emails in demo
const sentEmailsLog = [];

let transporter = null;

// Initialize transport
async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('📧 Connected to configured SMTP service for emails');
    return transporter;
  }

  // Fallback to local simulated transporter
  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows',
    buffer: true
  });
  console.log('📧 Using local development email transporter (Simulated Mailbox active)');
  return transporter;
}

/**
 * Send Customer Order Confirmation Email with Secret Delivery OTP
 */
async function sendOrderConfirmationEmail({ order, customerEmail, customerName, kitchenName }) {
  try {
    const to = customerEmail || 'customer@gharkirasoi.com';
    const otp = order.deliveryOtp;
    const itemsList = (order.items || [])
      .map(i => `<tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f1f1; font-size: 13px; color: #333;">${i.quantity || 1}x ${i.name || i.menuItem?.name || 'Homely Meal'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f1f1; font-size: 13px; text-align: right; font-weight: bold; color: #333;">₹${(i.price || i.menuItem?.price || 0) * (i.quantity || 1)}</td>
      </tr>`)
      .join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ghar Ki Rasoi Order Confirmation</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf8f5; margin: 0; padding: 24px;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #efeae4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Ghar Ki Rasoi 🍲</h1>
          <p style="margin: 0; font-size: 13px; opacity: 0.95;">Authentic Home-Cooked Food Delivery</p>
        </div>

        <div style="padding: 24px;">
          <h2 style="font-size: 18px; color: #1c1917; margin: 0 0 8px 0;">Order Confirmed, ${customerName || 'Foodie'}!</h2>
          <p style="font-size: 13px; color: #57534e; margin: 0 0 20px 0; line-height: 1.5;">
            Your order <strong>${order.orderNumber}</strong> has been received by <strong>${kitchenName || 'the home cook'}</strong>. Fresh ingredients are being prepared with care!
          </p>

          <!-- Secret OTP Box -->
          <div style="background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #065f46; letter-spacing: 0.8px;">Your Secret Delivery OTP</div>
            <div style="font-size: 32px; font-weight: 900; color: #047857; letter-spacing: 6px; margin: 6px 0;">${otp}</div>
            <div style="font-size: 11px; color: #065f46; font-style: italic;">
              ⚠️ Share this OTP with the delivery partner ONLY at your doorstep when your food is handed over.
            </div>
          </div>

          <!-- Items Table -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 700; color: #78716c; text-transform: uppercase; margin-bottom: 8px;">Order Details</div>
            <table style="width: 100%; border-collapse: collapse; background-color: #fafaf9; border-radius: 8px;">
              ${itemsList}
              <tr>
                <td style="padding: 10px 12px; font-size: 13px; color: #78716c;">Delivery Fee</td>
                <td style="padding: 10px 12px; font-size: 13px; text-align: right; color: #78716c;">₹${order.deliveryFee || 40}</td>
              </tr>
              <tr style="border-top: 2px solid #e7e5e4;">
                <td style="padding: 12px 12px; font-size: 15px; font-weight: 800; color: #1c1917;">Total Paid</td>
                <td style="padding: 12px 12px; font-size: 16px; font-weight: 800; text-align: right; color: #ea580c;">₹${order.totalAmount}</td>
              </tr>
            </table>
          </div>

          <!-- Delivery Address -->
          <div style="background-color: #f5f5f4; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #44403c; line-height: 1.4;">
            <strong>Delivering to:</strong> ${typeof order.deliveryAddress === 'string' ? order.deliveryAddress : (order.deliveryAddress?.street || 'Customer Address')}
          </div>
        </div>

        <div style="background-color: #fafaf9; padding: 14px; text-align: center; border-top: 1px solid #f0eee9; font-size: 11px; color: #a8a29e;">
          Thank you for supporting authentic neighborhood home cooks ❤️<br>
          Ghar Ki Rasoi • Fresh Homemade Food Network
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: '"Ghar Ki Rasoi" <orders@gharkirasoi.com>',
      to,
      subject: `Order Confirmed: #${order.orderNumber} - Your OTP is ${otp}`,
      html
    };

    const client = await getTransporter();
    await client.sendMail(mailOptions);

    const logEntry = {
      id: 'mail-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type: 'CUSTOMER_CONFIRMATION',
      to,
      subject: mailOptions.subject,
      orderNumber: order.orderNumber,
      orderId: order.id,
      timestamp: new Date().toISOString(),
      preview: `Order confirmed for ${kitchenName}. Doorstep OTP: ${otp}`
    };
    sentEmailsLog.unshift(logEntry);
    if (sentEmailsLog.length > 50) sentEmailsLog.pop();

    console.log(`📨 [EMAIL DISPATCHED] Confirmation sent to ${to} for Order ${order.orderNumber} (OTP: ${otp})`);
    return logEntry;
  } catch (err) {
    console.error('Failed to send order confirmation email:', err.message);
  }
}

/**
 * Send Kitchen Partner Order Alert Email
 */
async function sendKitchenOrderAlertEmail({ order, kitchenEmail, kitchenName }) {
  try {
    const to = kitchenEmail || 'cook@gharkirasoi.com';
    const itemsText = (order.items || []).map(i => `${i.quantity || 1}x ${i.name || i.menuItem?.name || 'Meal'}`).join(', ');

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; background-color: #faf8f5; padding: 20px;">
      <div style="max-width: 550px; margin: 0 auto; background-color: #fff; border-radius: 12px; padding: 24px; border: 1px solid #eed;">
        <h2 style="color: #ea580c; margin-top: 0;">🔔 New Order Received: #${order.orderNumber}</h2>
        <p>Hello <strong>${kitchenName || 'Home Cook'}</strong>,</p>
        <p>A new customer has ordered authentic homemade food from your kitchen:</p>
        <div style="background: #fff7ed; padding: 14px; border-radius: 8px; border-left: 4px solid #ea580c; margin: 16px 0;">
          <strong>Items to Cook:</strong> ${itemsText}<br>
          <strong>Customer:</strong> ${order.customerName || 'Aarav Sharma'}<br>
          <strong>Total Order Value:</strong> ₹${order.totalAmount}
        </div>
        <p>Please open your <strong>Cook Dashboard</strong> to accept and start preparing this order!</p>
      </div>
    </body>
    </html>
    `;

    const client = await getTransporter();
    await client.sendMail({
      from: '"Ghar Ki Rasoi Kitchens" <alerts@gharkirasoi.com>',
      to,
      subject: `🔔 New Order #${order.orderNumber} from ${order.customerName || 'Customer'}!`,
      html
    });

    const logEntry = {
      id: 'mail-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type: 'KITCHEN_ALERT',
      to,
      subject: `🔔 New Order #${order.orderNumber} for ${kitchenName}`,
      orderNumber: order.orderNumber,
      orderId: order.id,
      timestamp: new Date().toISOString(),
      preview: `New order alert: ${itemsText}`
    };
    sentEmailsLog.unshift(logEntry);
    console.log(`📨 [EMAIL DISPATCHED] Kitchen alert sent to ${to} for Order ${order.orderNumber}`);
    return logEntry;
  } catch (err) {
    console.error('Failed to send kitchen alert email:', err.message);
  }
}

/**
 * Send Rider Pickup Notification Email
 */
async function sendRiderReadyEmail({ order, riderEmail, kitchenName }) {
  try {
    const to = riderEmail || 'rider@gharkirasoi.com';
    const client = await getTransporter();
    await client.sendMail({
      from: '"Ghar Ki Rasoi Logistics" <logistics@gharkirasoi.com>',
      to,
      subject: `🛵 Order #${order.orderNumber} is PACKED & Ready for Pickup!`,
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h3>Order #${order.orderNumber} is packed at ${kitchenName}</h3>
        <p>Please proceed to pickup the meal parcel. Note: You will need to ask the customer for their 4-digit OTP at doorstep to complete delivery.</p>
      </div>`
    });

    const logEntry = {
      id: 'mail-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type: 'RIDER_ALERT',
      to,
      subject: `🛵 Order #${order.orderNumber} Packed & Ready`,
      orderNumber: order.orderNumber,
      orderId: order.id,
      timestamp: new Date().toISOString(),
      preview: `Food packed hot at ${kitchenName}. Ready for pickup.`
    };
    sentEmailsLog.unshift(logEntry);
    console.log(`📨 [EMAIL DISPATCHED] Rider notification sent to ${to} for Order ${order.orderNumber}`);
    return logEntry;
  } catch (err) {
    console.error('Failed to send rider alert email:', err.message);
  }
}

function getSentEmails() {
  return sentEmailsLog;
}

module.exports = {
  sendOrderConfirmationEmail,
  sendKitchenOrderAlertEmail,
  sendRiderReadyEmail,
  getSentEmails
};
