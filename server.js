// server.js - COMPLETE WITH ALL ENDPOINTS
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

// ==================== USER ENDPOINTS ====================

// Get user count (for analytics)
app.get('/api/users/count', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true });
        
        if (error) throw error;
        res.json({ count: data?.length || 0 });
    } catch (error) {
        console.error('Error fetching user count:', error);
        res.status(500).json({ error: error.message });
    }
});

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
            .select('*')
            .eq('product_id', id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
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
        
        const { rating, comment } = req.body;
        const productId = req.params.id;
        
        // Check if user already reviewed
        const { data: existing } = await supabase
            .from('reviews')
            .select('id')
            .eq('product_id', productId)
            .eq('user_id', user.id)
            .single();
        
        if (existing) {
            const { data, error } = await supabase
                .from('reviews')
                .update({ rating, comment, updated_at: new Date() })
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) throw error;
            return res.json(data);
        }
        
        const { data, error } = await supabase
            .from('reviews')
            .insert({
                product_id: productId,
                user_id: user.id,
                rating,
                comment
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

// Create order
// In server.js, make sure this endpoint exists:

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
    
    // Insert order
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
    
    if (orderError) {
      console.error('Order insert error:', orderError);
      return res.status(500).json({ error: orderError.message });
    }
    
    // Insert order items
    for (const item of items) {
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price
        });
      
      if (itemError) {
        console.error('Order item error:', itemError);
      }
    }
    
    res.json({ order, orderNumber });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});
        
        // Add order items
        for (const item of items) {
            const { error: itemError } = await supabase
                .from('order_items')
                .insert({
                    order_id: order.id,
                    product_id: item.id,
                    product_name: item.name,
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

// ==================== EMAIL FUNCTIONS ====================

// Send Welcome Email
async function sendWelcomeEmail(email, name) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Welcome to GETEDIL</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #0B4F2E, #D4AF37); padding: 30px; text-align: center; color: white; }
                .content { padding: 30px; }
                .button { display: inline-block; background-color: #0B4F2E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
                .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px; }
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
                    <div style="text-align: center;">
                        <a href="https://getedil.vercel.app" class="button">Start Exploring →</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2026 GETEDIL - Ethiopia's Digital Ecosystem</p>
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
                    
                    <div style="text-align: center;">
                        <a href="https://getedil.vercel.app/orders" class="button">Track Your Order →</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2026 GETEDIL - Ethiopia's Digital Ecosystem</p>
                    <p>Need help? Contact us at bilucute08@gmail.com</p>
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
