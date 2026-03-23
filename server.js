const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// User count
app.get('/api/users/count', async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('id', { count: 'exact', head: true });
        if (error) throw error;
        res.json({ count: data?.length || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    const { name, email, password, role = 'user' } = req.body;
    try {
        const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
        if (existing) return res.status(400).json({ error: 'User already exists' });
        
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { full_name: name, role }
        });
        if (authError) throw authError;
        
        const { data: user, error: userError } = await supabase.from('users').insert({
            id: authUser.user.id, email, full_name: name, role, trust_score: 100
        }).select().single();
        if (userError) throw userError;
        
        res.json({ user: { id: user.id, name: user.full_name, email: user.email, role: user.role }, token: authUser.session?.access_token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        const { data: user } = await supabase.from('users').select('*').eq('id', auth.user.id).single();
        res.json({ user: { id: user.id, name: user.full_name, email: user.email, role: user.role }, token: auth.session.access_token });
    } catch (error) {
        res.status(401).json({ error: 'Invalid email or password' });
    }
});

// Get user
app.get('/api/user', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
        res.json({ id: profile.id, name: profile.full_name, email: profile.email, role: profile.role });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Products
app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase.from('digital_products').select('*').eq('status', 'active').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('digital_products').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/search', async (req, res) => {
    try {
        const { q } = req.query;
        let query = supabase.from('digital_products').select('*').eq('status', 'active');
        if (q) query = query.ilike('name', `%${q}%`);
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reviews
app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase.from('reviews').select('*').eq('product_id', req.params.id).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products/:id/reviews', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        const { rating, comment } = req.body;
        const { data, error } = await supabase.from('reviews').insert({
            product_id: req.params.id, user_id: user.id, rating, comment
        }).select().single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Orders
app.get('/api/orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        const { data, error } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FIXED: Create order - NO AWAIT INSIDE LOOP
app.post('/api/orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    
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
            return res.status(500).json({ error: orderError.message });
        }
        
        // Insert order items using for...of (works with await)
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
                console.error('Item insert error:', itemError);
            }
        }
        
        res.json({ order, orderNumber });
    } catch (error) {
        console.error('Order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Email
app.post('/api/email/order-confirmation', async (req, res) => {
    const { email, name, orderNumber, total, items, shippingAddress } = req.body;
    const itemsHtml = items.map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>₿ ${item.price}</td><td>₿ ${item.price * item.quantity}</td></tr>`).join('');
    const html = `
        <h2>Order Confirmation</h2>
        <p>Thank you ${name}!</p>
        <p>Order #: ${orderNumber}</p>
        <p>Total: ₿ ${total}</p>
        <h3>Items:</h3>
        <table border="1"><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>${itemsHtml}</table>
        <p>Shipping: ${shippingAddress?.address || 'N/A'}</p>
        <a href="https://getedil.vercel.app/orders">Track Order</a>
    `;
    try {
        await transporter.sendMail({ from: process.env.EMAIL_USER, to: email, subject: `Order Confirmation #${orderNumber}`, html });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 GETEDIL API running on port ${PORT}`);
});
