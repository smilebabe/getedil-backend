// server.js - COMPLETE WITH ALL FEATURES (FULL VERSION)
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        message: 'GETEDIL API is running!'
    });
});

// ==================== PRODUCTS ENDPOINTS ====================

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('digital_products')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('digital_products')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search products
app.get('/api/products/search', async (req, res) => {
    try {
        const { q, category, minPrice, maxPrice, sortBy } = req.query;
        
        let query = supabase
            .from('digital_products')
            .select('*')
            .eq('status', 'active');
        
        if (q) {
            query = query.ilike('name', `%${q}%`);
        }
        
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }
        
        if (minPrice) {
            query = query.gte('price', parseFloat(minPrice));
        }
        
        if (maxPrice) {
            query = query.lte('price', parseFloat(maxPrice));
        }
        
        if (sortBy === 'price_asc') {
            query = query.order('price', { ascending: true });
        } else if (sortBy === 'price_desc') {
            query = query.order('price', { ascending: false });
        } else if (sortBy === 'newest') {
            query = query.order('created_at', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== REVIEWS ENDPOINTS ====================

// Get product reviews
app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('reviews')
            .select('*, users:user_id(full_name)')
            .eq('product_id', id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const formattedReviews = data.map(review => ({
            ...review,
            user_name: review.users?.full_name || 'Anonymous'
        }));
        
        res.json(formattedReviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add review
app.post('/api/products/:id/reviews', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError) throw authError;
        
        const { rating, title, comment } = req.body;
        const productId = req.params.id;
        
        // Check if user already reviewed
        const { data: existing } = await supabase
            .from('reviews')
            .select('id')
            .eq('product_id', productId)
            .eq('user_id', user.id)
            .single();
        
        if (existing) {
            // Update existing review
            const { data, error } = await supabase
                .from('reviews')
                .update({ rating, title, comment, updated_at: new Date() })
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) throw error;
            return res.json(data);
        }
        
        // Create new review
        const { data, error } = await supabase
            .from('reviews')
            .insert({
                product_id: productId,
                user_id: user.id,
                rating,
                title,
                comment,
                verified_purchase: false
            })
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ORDERS ENDPOINTS ====================

// Get user orders
app.get('/api/orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError) throw authError;
        
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single order with tracking
app.get('/api/orders/:id', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create order
app.post('/api/orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError) throw authError;
        
        const { items, total_amount, shipping_address } = req.body;
        const orderNumber = 'ORD-' + Date.now();
        
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                user_id: user.id,
                total_amount,
                status: 'pending',
                shipping_address
            })
            .select()
            .single();
        
        if (orderError) throw orderError;
        
        // Add order items
        for (const item of items) {
            const { error: itemError } = await supabase
                .from('order_items')
                .insert({
                    order_id: order.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    price: item.price
                });
            
            if (itemError) throw itemError;
        }
        
        // Send order confirmation email
        try {
            await fetch(`${process.env.API_URL || 'https://getedil-api.onrender.com'}/api/email/order-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    name: user.user_metadata?.full_name || 'Customer',
                    orderNumber,
                    total: total_amount,
                    items,
                    shippingAddress: shipping_address
                })
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }
        
        res.json({ order, orderNumber });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== AUTHENTICATION ENDPOINTS ====================

// REGISTER
app.post('/api/register', async (req, res) => {
    const { name, email, password, role = 'user' } = req.body;
    
    try {
        // Check if user exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name, role }
        });
        
        if (authError) throw authError;
        
        // Create user profile
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                id: authUser.user.id,
                email,
                full_name: name,
                role,
                trust_score: 100
            })
            .select()
            .single();
        
        if (userError) throw userError;
        
        // Send Welcome Email
        try {
            await sendWelcomeEmail(email, name);
        } catch (emailError) {
            console.error('Welcome email failed:', emailError);
        }
        
        res.json({ 
            user: { 
                id: user.id, 
                name: user.full_name, 
                email: user.email, 
                role: user.role 
            }, 
            token: authUser.session?.access_token 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (authError) throw authError;
        
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', auth.user.id)
            .single();
        
        res.json({ 
            user: { 
                id: user.id, 
                name: user.full_name, 
                email: user.email, 
                role: user.role 
            }, 
            token: auth.session.access_token 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: 'Invalid email or password' });
    }
});

// GET CURRENT USER
app.get('/api/user', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error) throw error;
        
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
        
        res.json({ 
            id: profile.id, 
            name: profile.full_name, 
            email: profile.email, 
            role: profile.role 
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ==================== EMAIL FUNCTIONS ====================

// Send Welcome Email
async function sendWelcomeEmail(email, name) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to GETEDIL</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #0B4F2E, #D4AF37); padding: 30px; text-align: center; color: white; }
                .content { padding: 30px; }
                .button { display: inline-block; background-color: #0B4F2E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
                .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px; }
                .feature { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏗️ GETEDIL</h1>
                    <p>Ethiopia's Digital Ecosystem</p>
                </div>
                <div class="content">
                    <h2>Welcome to GETEDIL, ${name}! 🎉</h2>
                    <p>Thank you for joining Ethiopia's most comprehensive digital platform.</p>
                    
                    <div class="feature">
                        <strong>✨ What you can do on GETEDIL:</strong>
                        <ul>
                            <li>🛍️ Browse and purchase digital products</li>
                            <li>📚 Take online courses and earn certificates</li>
                            <li>💰 Send and receive money with Telebirr</li>
                            <li>🏗️ Download 3D BIM models</li>
                            <li>🤝 Connect with professionals</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="https://getedil.vercel.app" class="button">Start Exploring →</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2026 GETEDIL - Ethiopia's Digital Ecosystem</p>
                    <p>Addis Ababa, Ethiopia</p>
                    <p><a href="https://getedil.vercel.app">Visit our website</a> | <a href="mailto:support@getedil.com">Contact Support</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to GETEDIL! 🎉',
        html
    });
}

// Send Order Confirmation Email
app.post('/api/email/order-confirmation', async (req, res) => {
    const { email, name, orderNumber, total, items, shippingAddress } = req.body;
    
    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₿ ${item.price}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₿ ${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
    `).join('');
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Confirmation - GETEDIL</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #0B4F2E, #D4AF37); padding: 20px; text-align: center; color: white; }
                .content { padding: 30px; }
                .order-details { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
                table { width: 100%; border-collapse: collapse; }
                th { text-align: left; padding: 10px; background-color: #f0f0f0; }
                .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 10px; border-top: 2px solid #eee; }
                .button { display: inline-block; background-color: #0B4F2E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
                .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Order Confirmation</h2>
                </div>
                <div class="content">
                    <h2>Thank you for your order, ${name}! 🎉</h2>
                    <p>Your order has been confirmed and is being processed.</p>
                    
                    <div class="order-details">
                        <p><strong>Order Number:</strong> ${orderNumber}</p>
                        <p><strong>Order Date:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Payment Method:</strong> GETEDIL Wallet</p>
                    </div>
                    
                    <h3>Order Summary</h3>
                    <table>
                        <thead>
                            <tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    
                    <div class="total">
                        <strong>Total: ₿ ${total.toLocaleString()}</strong>
                    </div>
                    
                    ${shippingAddress ? `
                        <h3>Shipping Address</h3>
                        <p>
                            ${shippingAddress.full_name}<br>
                            ${shippingAddress.address}<br>
                            ${shippingAddress.city}, ${shippingAddress.country}
                        </p>
                    ` : ''}
                    
                    <div style="text-align: center;">
                        <a href="https://getedil.vercel.app/orders" class="button">Track Your Order →</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2026 GETEDIL - Ethiopia's Digital Ecosystem</p>
                    <p>Need help? Contact us at support@getedil.com</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Order Confirmation #${orderNumber}`,
            html
        });
        res.json({ success: true, message: 'Order confirmation email sent' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send Password Reset Email
app.post('/api/email/reset-password', async (req, res) => {
    const { email, resetToken } = req.body;
    
    const resetLink = `https://getedil.vercel.app/reset-password?token=${resetToken}`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reset Your Password - GETEDIL</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #0B4F2E, #D4AF37); padding: 30px; text-align: center; color: white; }
                .content { padding: 30px; }
                .button { display: inline-block; background-color: #0B4F2E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
                .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏗️ GETEDIL</h1>
                </div>
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    
                    <div style="text-align: center;">
                        <a href="${resetLink}" class="button">Reset Password</a>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this, please ignore this email.
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="color: #666; font-size: 12px; word-break: break-all;">${resetLink}</p>
                </div>
                <div class="footer">
                    <p>© 2026 GETEDIL - Ethiopia's Digital Ecosystem</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Reset Your GETEDIL Password',
            html
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send Contact Form Email
app.post('/api/email/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Contact Form Submission - GETEDIL</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #0B4F2E, #D4AF37); padding: 20px; text-align: center; color: white; }
                .content { padding: 30px; }
                .message-box { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>New Contact Form Submission</h2>
                </div>
                <div class="content">
                    <p><strong>From:</strong> ${name} (${email})</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <div class="message-box">
                        <strong>Message:</strong><br>
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                </div>
                <div class="footer">
                    <p>© 2026 GETEDIL - Ethiopia's Digital Ecosystem</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `Contact Form: ${subject}`,
            html
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 GETEDIL API running on port ${PORT}`);
    console.log(`📧 Email notifications enabled`);
});

module.exports = app;
