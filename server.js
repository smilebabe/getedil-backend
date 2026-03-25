const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
const stream = require('stream');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'));
        }
    }
});

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

// ==================== HELPER FUNCTIONS ====================
function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function sendVerificationEmail(email, name, token) {
    const verificationLink = `https://getedil.vercel.app/verify-email?token=${token}`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Verify Your Email - GETEDIL</title>
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
                </div>
                <div class="content">
                    <h2>Verify Your Email Address</h2>
                    <p>Hello ${name},</p>
                    <p>Thank you for registering with GETEDIL! Please verify your email address by clicking the button below:</p>
                    <div style="text-align: center;">
                        <a href="${verificationLink}" class="button">Verify Email Address</a>
                    </div>
                    <p style="margin-top: 20px; color: #666; font-size: 12px;">This link expires in 24 hours.</p>
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
        subject: 'Verify Your GETEDIL Account',
        html
    });
}

async function sendPasswordResetEmail(email, name, token) {
    const resetLink = `https://getedil.vercel.app/reset-password?token=${token}`;
    
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
                .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏗️ GETEDIL</h1>
                </div>
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>Hello ${name},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <div style="text-align: center;">
                        <a href="${resetLink}" class="button">Reset Password</a>
                    </div>
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour.
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
        subject: 'Reset Your GETEDIL Password',
        html
    });
}

// Send newsletter verification email
async function sendNewsletterVerificationEmail(email, name, token) {
    const verificationLink = `https://getedil.vercel.app/api/newsletter/verify?token=${token}`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Verify Your Newsletter Subscription - GETEDIL</title>
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
                </div>
                <div class="content">
                    <h2>Confirm Your Subscription</h2>
                    <p>Hello ${name || 'there'},</p>
                    <p>Thank you for subscribing to the GETEDIL newsletter! You'll receive updates about new products, promotions, and platform news.</p>
                    <div style="text-align: center;">
                        <a href="${verificationLink}" class="button">Confirm Subscription</a>
                    </div>
                    <p style="margin-top: 20px; color: #666; font-size: 12px;">If you didn't subscribe to our newsletter, you can ignore this email.</p>
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
        subject: 'Confirm Your GETEDIL Newsletter Subscription',
        html
    });
}

// Send newsletter email
async function sendNewsletterEmail(email, name, subject, content, campaignId) {
    const unsubscribeLink = `https://getedil.vercel.app/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${subject}</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #0B4F2E, #D4AF37); padding: 20px; text-align: center; color: white; }
                .content { padding: 30px; line-height: 1.6; }
                .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px; }
                .unsubscribe { color: #666; text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏗️ GETEDIL</h1>
                </div>
                <div class="content">
                    <h2>Hello ${name || 'there'}!</h2>
                    ${content}
                </div>
                <div class="footer">
                    <p>© 2026 GETEDIL - Ethiopia's Digital Ecosystem</p>
                    <p>
                        <a href="${unsubscribeLink}" class="unsubscribe">Unsubscribe</a> from future emails.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html
    });
}

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        message: 'GETEDIL API is running!'
    });
});

// ==================== IMAGE UPLOAD ENDPOINT ====================
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `products/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                cacheControl: '3600'
            });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
        
        const imageUrl = urlData.publicUrl;
        
        res.json({ 
            success: true, 
            imageUrl,
            filePath,
            message: 'Image uploaded successfully!'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== USER ENDPOINTS ====================

app.get('/api/users/count', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true });
        
        if (error) throw error;
        res.json({ count: data?.length || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { name, email, password, role = 'user' } = req.body;
    
    try {
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: false,
            user_metadata: { full_name: name, role }
        });
        
        if (authError) throw authError;
        
        const verificationToken = generateVerificationToken();
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24);
        
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                id: authUser.user.id,
                email,
                full_name: name,
                role,
                trust_score: 100,
                email_verified: false,
                verification_token: verificationToken,
                verification_token_expires: tokenExpiry.toISOString()
            })
            .select()
            .single();
        
        if (userError) throw userError;
        
        try {
            await sendVerificationEmail(email, name, verificationToken);
        } catch (emailError) {
            console.error('Verification email failed:', emailError);
        }
        
        res.json({ 
            user: { 
                id: user.id, 
                name: user.full_name, 
                email: user.email, 
                role: user.role,
                email_verified: false
            }, 
            token: authUser.session?.access_token,
            message: 'Please check your email to verify your account.'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/verify-email', async (req, res) => {
    const { token } = req.body;
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('verification_token', token)
            .single();
        
        if (error || !user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }
        
        if (new Date(user.verification_token_expires) < new Date()) {
            return res.status(400).json({ error: 'Verification token has expired' });
        }
        
        await supabase
            .from('users')
            .update({ 
                email_verified: true,
                verification_token: null,
                verification_token_expires: null
            })
            .eq('id', user.id);
        
        await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true,
            user_metadata: { ...user.user_metadata, email_verified: true }
        });
        
        res.json({ success: true, message: 'Email verified successfully!' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/resend-verification', async (req, res) => {
    const { email } = req.body;
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }
        
        const newToken = generateVerificationToken();
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24);
        
        await supabase
            .from('users')
            .update({
                verification_token: newToken,
                verification_token_expires: tokenExpiry.toISOString()
            })
            .eq('id', user.id);
        
        await sendVerificationEmail(email, user.full_name, newToken);
        
        res.json({ success: true, message: 'Verification email sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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
        
        if (!user.email_verified) {
            return res.status(403).json({ 
                error: 'Please verify your email before logging in',
                needsVerification: true 
            });
        }
        
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

app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !user) {
            return res.json({ success: true, message: 'If an account exists, a reset link will be sent.' });
        }
        
        const resetToken = generateVerificationToken();
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 1);
        
        await supabase
            .from('users')
            .update({
                reset_password_token: resetToken,
                reset_password_expires: tokenExpiry.toISOString()
            })
            .eq('id', user.id);
        
        await sendPasswordResetEmail(email, user.full_name, resetToken);
        
        res.json({ success: true, message: 'If an account exists, a reset link will be sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('reset_password_token', token)
            .single();
        
        if (error || !user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        
        if (new Date(user.reset_password_expires) < new Date()) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }
        
        await supabase.auth.admin.updateUserById(user.id, {
            password: newPassword
        });
        
        await supabase
            .from('users')
            .update({
                reset_password_token: null,
                reset_password_expires: null
            })
            .eq('id', user.id);
        
        res.json({ success: true, message: 'Password reset successfully!' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: error.message });
    }
});

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
            role: profile.role,
            email_verified: profile.email_verified
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.put('/api/user/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        
        const { name, phone, bio } = req.body;
        
        await supabase
            .from('users')
            .update({ full_name: name, phone, bio })
            .eq('id', user.id);
        
        await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: { full_name: name }
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PRODUCTS ENDPOINTS ====================

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

// ==================== RELATED PRODUCTS ENDPOINT ====================
app.get('/api/products/related/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: current, error: currentError } = await supabase
            .from('digital_products')
            .select('category')
            .eq('id', id)
            .single();
        
        if (currentError || !current) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const { data, error } = await supabase
            .from('digital_products')
            .select('*')
            .eq('category', current.category)
            .eq('status', 'active')
            .neq('id', id)
            .limit(4);
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching related products:', error);
        res.status(500).json({ error: error.message });
    }
});

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

app.post('/api/products', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        const { name, description, price, is_free, category, image_url } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const { data, error } = await supabase
            .from('digital_products')
            .insert({
                seller_id: user.id,
                name,
                slug,
                description,
                price: parseFloat(price) || 0,
                is_free: is_free || false,
                category: category || 'documents',
                cover_image: image_url || null,
                status: 'active'
            })
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== REVIEWS ENDPOINTS ====================

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

// ==================== COUPON ENDPOINTS ====================

// Validate coupon
app.post('/api/coupons/validate', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        const { code, subtotal } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Coupon code required' });
        }
        
        const { data: coupon, error: couponError } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('active', true)
            .single();
        
        if (couponError || !coupon) {
            return res.status(404).json({ error: 'Invalid coupon code' });
        }
        
        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
            return res.status(400).json({ error: 'Coupon not yet active' });
        }
        if (coupon.valid_until && new Date(coupon.valid_until) < now) {
            return res.status(400).json({ error: 'Coupon has expired' });
        }
        
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ error: 'Coupon usage limit reached' });
        }
        
        const { data: userUsage, error: usageError } = await supabase
            .from('coupon_usage')
            .select('*')
            .eq('coupon_id', coupon.id)
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (userUsage) {
            return res.status(400).json({ error: 'You have already used this coupon' });
        }
        
        if (subtotal < coupon.min_purchase) {
            return res.status(400).json({ 
                error: `Minimum purchase of ₿ ${coupon.min_purchase} required` 
            });
        }
        
        let discount = 0;
        if (coupon.discount_type === 'percentage') {
            discount = subtotal * (coupon.discount_value / 100);
            if (coupon.max_discount && discount > coupon.max_discount) {
                discount = coupon.max_discount;
            }
        } else {
            discount = coupon.discount_value;
        }
        
        discount = Math.min(discount, subtotal);
        
        res.json({
            id: coupon.id,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            discount_amount: discount,
            max_discount: coupon.max_discount,
            min_purchase: coupon.min_purchase,
            description: coupon.description
        });
        
    } catch (error) {
        console.error('Coupon validation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get available coupons for user
app.get('/api/coupons/available', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('active', true)
            .lte('valid_from', now)
            .gte('valid_until', now)
            .lt('used_count', supabase.raw('usage_limit'))
            .not('id', 'in', 
                supabase.from('coupon_usage').select('coupon_id').eq('user_id', user.id)
            );
        
        if (error) throw error;
        res.json(data);
        
    } catch (error) {
        console.error('Available coupons error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ORDERS ENDPOINTS ====================

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

app.get('/api/orders/:id', async (req, res) => {
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
            .eq('id', req.params.id)
            .eq('user_id', user.id)
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        const { items, total_amount, shipping_address, coupon_code, discount_amount } = req.body;
        const orderNumber = 'ORD-' + Date.now();
        
        const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
        order_number: orderNumber,
        user_id: user.id,
        total_amount,
        discount_amount: discount_amount || 0,
        status: 'pending',
        shipping_address
    })
    .select()
    .single();
        
        if (orderError) {
            return res.status(500).json({ error: orderError.message });
        }
        
        for (const item of items) {
            await supabase
                .from('order_items')
                .insert({
                    order_id: order.id,
                    product_id: item.id,
                    product_name: item.name,
                    quantity: item.quantity,
                    price: item.price
                });
        }
        
        // Record coupon usage if coupon was applied
        if (coupon_code) {
            const { data: coupon } = await supabase
                .from('coupons')
                .select('id')
                .eq('code', coupon_code)
                .single();
            
            if (coupon) {
                await supabase
                    .from('coupon_usage')
                    .insert({
                        coupon_id: coupon.id,
                        user_id: user.id,
                        order_id: order.id,
                        discount_amount
                    });
                
                await supabase
                    .from('coupons')
                    .update({ used_count: supabase.raw('used_count + 1') })
                    .eq('id', coupon.id);
            }
        }
        
        res.json({ order, orderNumber });
    } catch (error) {
        console.error('Order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== SELLER ANALYTICS ENDPOINT ====================
app.get('/api/seller/analytics', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        const { period = 'week' } = req.query;
        
        const { data: products, error: productsError } = await supabase
            .from('digital_products')
            .select('id, name, price, category')
            .eq('seller_id', user.id);
        
        if (productsError) throw productsError;
        
        const productIds = products.map(p => p.id);
        
        if (productIds.length === 0) {
            return res.json({
                totalRevenue: 0,
                totalOrders: 0,
                totalProducts: 0,
                avgOrderValue: 0,
                conversionRate: 0,
                dailySales: [],
                topProducts: [],
                categoryBreakdown: [],
                recentOrders: []
            });
        }
        
        let interval = '7 days';
        if (period === 'month') interval = '30 days';
        if (period === 'year') interval = '365 days';
        
        const startDate = new Date();
        if (period === 'week') startDate.setDate(startDate.getDate() - 7);
        else if (period === 'month') startDate.setDate(startDate.getDate() - 30);
        else startDate.setFullYear(startDate.getFullYear() - 1);
        
        const { data: orderItems, error: ordersError } = await supabase
            .from('order_items')
            .select(`
                *,
                orders!inner (created_at, order_number, status)
            `)
            .in('product_id', productIds)
            .gte('orders.created_at', startDate.toISOString());
        
        if (ordersError) throw ordersError;
        
        const totalRevenue = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalOrders = new Set(orderItems.map(item => item.order_id)).size;
        
        const dailySales = {};
        orderItems.forEach(item => {
            const date = new Date(item.orders.created_at).toISOString().split('T')[0];
            if (!dailySales[date]) {
                dailySales[date] = { date, revenue: 0, orders: 0 };
            }
            dailySales[date].revenue += item.price * item.quantity;
            dailySales[date].orders += 1;
        });
        
        const productSales = {};
        orderItems.forEach(item => {
            const product = products.find(p => p.id === item.product_id);
            if (!productSales[item.product_id]) {
                productSales[item.product_id] = {
                    id: item.product_id,
                    name: product?.name || 'Unknown',
                    sales: 0,
                    revenue: 0
                };
            }
            productSales[item.product_id].sales += item.quantity;
            productSales[item.product_id].revenue += item.price * item.quantity;
        });
        
        const topProducts = Object.values(productSales).sort((a, b) => b.sales - a.sales).slice(0, 5);
        
        const categorySales = {};
        orderItems.forEach(item => {
            const product = products.find(p => p.id === item.product_id);
            const category = product?.category || 'uncategorized';
            if (!categorySales[category]) {
                categorySales[category] = { category, sales: 0 };
            }
            categorySales[category].sales += item.quantity;
        });
        
        const categoryBreakdown = Object.values(categorySales).map(c => ({
            category: c.category,
            sales: c.sales
        }));
        
        const recentOrders = orderItems
            .sort((a, b) => new Date(b.orders.created_at) - new Date(a.orders.created_at))
            .slice(0, 10)
            .map(item => ({
                id: item.order_id,
                order_number: item.orders.order_number,
                product_name: products.find(p => p.id === item.product_id)?.name || 'Unknown',
                amount: item.price * item.quantity,
                status: item.orders.status,
                created_at: item.orders.created_at
            }));
        
        res.json({
            totalRevenue,
            totalOrders,
            totalProducts: productIds.length,
            avgOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
            conversionRate: totalOrders > 0 ? ((totalOrders / (totalOrders + 100)) * 100).toFixed(1) : 0,
            dailySales: Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date)),
            topProducts,
            categoryBreakdown,
            recentOrders
        });
        
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== BULK UPLOAD ENDPOINT ====================
const csvUpload = multer({ storage: multer.memoryStorage() });

app.post('/api/seller/bulk-upload', csvUpload.single('file'), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const results = [];
        const errors = [];
        let successCount = 0;
        
        const csvBuffer = req.file.buffer;
        const readableStream = new stream.Readable();
        readableStream.push(csvBuffer);
        readableStream.push(null);
        
        const validCategories = ['documents', 'graphics', 'software', 'audio', 'video', 'ebooks', 'photos', '3d'];
        
        await new Promise((resolve) => {
            readableStream
                .pipe(csv())
                .on('data', async (row) => {
                    const { name, description, price, is_free, category, file_format } = row;
                    
                    if (!name) {
                        errors.push(`Missing name in row: ${JSON.stringify(row)}`);
                        return;
                    }
                    
                    if (category && !validCategories.includes(category)) {
                        errors.push(`Invalid category "${category}" for product "${name}". Valid: ${validCategories.join(', ')}`);
                        return;
                    }
                    
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    const isFree = is_free === 'true' || is_free === true;
                    const productPrice = isFree ? 0 : parseFloat(price) || 0;
                    
                    try {
                        const { error: insertError } = await supabase
                            .from('digital_products')
                            .insert({
                                seller_id: user.id,
                                name,
                                slug,
                                description: description || '',
                                price: productPrice,
                                is_free: isFree,
                                category: category || 'documents',
                                file_format: file_format || 'pdf',
                                status: 'active'
                            });
                        
                        if (insertError) {
                            errors.push(`Error inserting "${name}": ${insertError.message}`);
                        } else {
                            successCount++;
                            results.push({ name, success: true });
                        }
                    } catch (err) {
                        errors.push(`Error inserting "${name}": ${err.message}`);
                    }
                })
                .on('end', () => {
                    resolve();
                });
        });
        
        res.json({
            success: errors.length === 0,
            total: results.length + errors.length,
            successCount,
            failedCount: errors.length,
            errors: errors.slice(0, 20)
        });
        
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== EMAIL FUNCTIONS ====================

app.post('/api/email/order-confirmation', async (req, res) => {
    const { email, name, orderNumber, total, subtotal, discount, coupon_code, items, shippingAddress } = req.body;
    
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
                    <table border="1">
                        <thead>
                            <tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Subtotal:</span>
                            <span>₿ ${subtotal?.toLocaleString() || total?.toLocaleString()}</span>
                        </div>
                        ${discount > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #10B981;">
                            <span>Discount ${coupon_code ? `(${coupon_code})` : ''}:</span>
                            <span>- ₿ ${discount.toLocaleString()}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 10px; border-top: 2px solid #eee;">
                            <span>Total:</span>
                            <span style="color: #0B4F2E;">₿ ${total?.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    ${shippingAddress ? `
                    <div style="margin-top: 20px;">
                        <h3>Shipping Address</h3>
                        <p>
                            ${shippingAddress.full_name}<br>
                            ${shippingAddress.address}<br>
                            ${shippingAddress.city}, ${shippingAddress.country}
                        </p>
                    </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin-top: 30px;">
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
        res.json({ success: true });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/email/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Contact Form Submission - GETEDIL</title>
        </head>
        <body>
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
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

// ==================== PDF INVOICE ENDPOINT ====================

app.get('/api/orders/:id/invoice', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        const { id } = req.params;
        
        // Get order details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
        
        if (orderError || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Get order items
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', id);
        
        if (itemsError) throw itemsError;
        
        // Get user profile
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
        
        // Create PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.order_number}.pdf`);
        
        doc.pipe(res);
        
        // Header with Logo
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#0B4F2E')
           .text('GETEDIL', { align: 'center' });
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#666666')
           .text('Ethiopia\'s Digital Ecosystem', { align: 'center' });
        doc.moveDown();
        
        // Invoice Title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('INVOICE', { align: 'center' });
        doc.moveDown();
        
        // Invoice Details
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#333333');
        
        // Left Column - Order Info
        doc.text(`Invoice Number: INV-${order.order_number}`, 50, 150);
        doc.text(`Order Date: ${new Date(order.created_at).toLocaleDateString()}`, 50, 165);
        doc.text(`Order Status: ${order.status.toUpperCase()}`, 50, 180);
        
        // Right Column - Customer Info
        doc.text(`Bill To:`, 350, 150);
        doc.text(`${profile?.full_name || 'Customer'}`, 350, 165);
        doc.text(`${profile?.email || ''}`, 350, 180);
        if (profile?.phone) doc.text(`${profile.phone}`, 350, 195);
        
        // Shipping Address
        if (order.shipping_address) {
            const addr = order.shipping_address;
            doc.text(`Ship To:`, 350, 225);
            doc.text(`${addr.full_name || ''}`, 350, 240);
            doc.text(`${addr.address || ''}`, 350, 255);
            doc.text(`${addr.city || ''}, ${addr.country || 'Ethiopia'}`, 350, 270);
        }
        
        doc.moveDown(2);
        
        // Items Table Header
        let yPosition = 320;
        doc.font('Helvetica-Bold')
           .fillColor('#0B4F2E')
           .rect(50, yPosition - 5, 495, 25)
           .fill('#F0FDF4');
        doc.fillColor('#0B4F2E')
           .text('Product', 60, yPosition)
           .text('Quantity', 300, yPosition, { width: 80, align: 'center' })
           .text('Unit Price', 380, yPosition, { width: 80, align: 'center' })
           .text('Total', 460, yPosition, { width: 80, align: 'center' });
        
        yPosition += 25;
        
        // Items Table Rows
        doc.font('Helvetica')
           .fillColor('#333333');
        
        let subtotal = 0;
        items.forEach((item, index) => {
            const total = item.price * item.quantity;
            subtotal += total;
            
            // Truncate long product names
            const productName = item.product_name.length > 40 
                ? item.product_name.substring(0, 37) + '...' 
                : item.product_name;
            
            doc.text(productName, 60, yPosition, { width: 230 })
               .text(item.quantity.toString(), 300, yPosition, { width: 80, align: 'center' })
               .text(`₿ ${item.price.toLocaleString()}`, 380, yPosition, { width: 80, align: 'center' })
               .text(`₿ ${total.toLocaleString()}`, 460, yPosition, { width: 80, align: 'center' });
            yPosition += 20;
            
            // Add new page if needed
            if (yPosition > 700 && index < items.length - 1) {
                doc.addPage();
                yPosition = 50;
            }
        });
        
        // Totals Section
        yPosition += 20;
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 380, yPosition, { width: 80, align: 'right' })
           .text(`₿ ${subtotal.toLocaleString()}`, 460, yPosition, { width: 80, align: 'right' });
        yPosition += 20;
        
        // Discount if applied
        const discount = order.discount_amount || 0;
        if (discount > 0) {
            doc.fillColor('#10B981')
               .text('Discount:', 380, yPosition, { width: 80, align: 'right' })
               .text(`- ₿ ${discount.toLocaleString()}`, 460, yPosition, { width: 80, align: 'right' });
            yPosition += 20;
        }
        
        // Total
        const total = order.total_amount;
        doc.fillColor('#0B4F2E')
           .font('Helvetica-Bold')
           .fontSize(12)
           .text('Total:', 380, yPosition, { width: 80, align: 'right' })
           .text(`₿ ${total.toLocaleString()}`, 460, yPosition, { width: 80, align: 'right' });
        
        // Footer
        const footerY = 750;
        doc.fontSize(8)
           .fillColor('#999999')
           .text('Thank you for shopping at GETEDIL!', 50, footerY, { align: 'center', width: 495 })
           .text('For questions about this invoice, please contact support@getedil.com', 50, footerY + 15, { align: 'center', width: 495 });
        
        // Finalize PDF
        doc.end();
        
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== NEWSLETTER ENDPOINTS ====================

// Subscribe to newsletter
app.post('/api/newsletter/subscribe', async (req, res) => {
    const { email, name, preferences } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    
    try {
        // Check if already subscribed
        const { data: existing } = await supabase
            .from('newsletter_subscribers')
            .select('id, status')
            .eq('email', email)
            .single();
        
        if (existing) {
            if (existing.status === 'active') {
                return res.status(400).json({ error: 'Email already subscribed' });
            } else {
                // Reactivate
                const { error: updateError } = await supabase
                    .from('newsletter_subscribers')
                    .update({ 
                        status: 'active',
                        subscribed_at: new Date(),
                        preferences: preferences || { promotions: true, new_products: true, updates: true }
                    })
                    .eq('id', existing.id);
                
                if (updateError) throw updateError;
                return res.json({ success: true, message: 'Subscription reactivated!' });
            }
        }
        
        // Generate tokens
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const unsubscribeToken = crypto.randomBytes(32).toString('hex');
        
        // Insert new subscriber
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .insert({
                email,
                name: name || null,
                verification_token: verificationToken,
                unsubscribe_token: unsubscribeToken,
                preferences: preferences || { promotions: true, new_products: true, updates: true }
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Send verification email
        await sendNewsletterVerificationEmail(email, name, verificationToken);
        
        res.json({ 
            success: true, 
            message: 'Please check your email to verify your subscription.',
            subscriber_id: data.id
        });
        
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify newsletter subscription
app.get('/api/newsletter/verify', async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
        return res.status(400).json({ error: 'Verification token required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .update({ verified: true, status: 'active' })
            .eq('verification_token', token)
            .eq('verified', false)
            .select()
            .single();
        
        if (error || !data) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }
        
        res.redirect('https://getedil.vercel.app/newsletter/verified');
        
    } catch (error) {
        console.error('Newsletter verification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unsubscribe from newsletter
app.post('/api/newsletter/unsubscribe', async (req, res) => {
    const { email, token } = req.body;
    
    try {
        let query = supabase.from('newsletter_subscribers').update({ status: 'unsubscribed' });
        
        if (token) {
            query = query.eq('unsubscribe_token', token);
        } else if (email) {
            query = query.eq('email', email);
        } else {
            return res.status(400).json({ error: 'Email or token required' });
        }
        
        const { error } = await query;
        
        if (error) throw error;
        
        res.json({ success: true, message: 'Successfully unsubscribed' });
        
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send newsletter campaign (admin only)
app.post('/api/newsletter/send', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        // Check if user is admin
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (profile?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { subject, content, preferences } = req.body;
        
        if (!subject || !content) {
            return res.status(400).json({ error: 'Subject and content required' });
        }
        
        // Get subscribers
        let query = supabase
            .from('newsletter_subscribers')
            .select('email, name, preferences')
            .eq('status', 'active')
            .eq('verified', true);
        
        if (preferences) {
            // Filter by preferences
            query = query.contains('preferences', preferences);
        }
        
        const { data: subscribers, error: subError } = await query;
        
        if (subError) throw subError;
        
        // Create campaign record
        const { data: campaign, error: campaignError } = await supabase
            .from('newsletter_campaigns')
            .insert({
                subject,
                content,
                recipient_count: subscribers.length,
                status: 'sending'
            })
            .select()
            .single();
        
        if (campaignError) throw campaignError;
        
        // Send emails (batch send)
        let sentCount = 0;
        for (const subscriber of subscribers) {
            try {
                await sendNewsletterEmail(subscriber.email, subscriber.name, subject, content, campaign.id);
                sentCount++;
                
                // Log sent
                await supabase
                    .from('newsletter_sent_log')
                    .insert({
                        campaign_id: campaign.id,
                        subscriber_id: subscriber.id,
                        sent_at: new Date()
                    });
            } catch (emailError) {
                console.error(`Failed to send to ${subscriber.email}:`, emailError);
            }
        }
        
        // Update campaign status
        await supabase
            .from('newsletter_campaigns')
            .update({ 
                status: 'sent', 
                sent_at: new Date(),
                recipient_count: sentCount
            })
            .eq('id', campaign.id);
        
        res.json({ 
            success: true, 
            message: `Newsletter sent to ${sentCount} subscribers`,
            campaign_id: campaign.id
        });
        
    } catch (error) {
        console.error('Send newsletter error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get newsletter stats (admin only)
app.get('/api/newsletter/stats', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError) throw authError;
        
        // Check admin
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (profile?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Get stats
        const [totalSubscribers, verifiedSubscribers, recentCampaigns] = await Promise.all([
            supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }),
            supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('verified', true),
            supabase.from('newsletter_campaigns').select('*').order('created_at', { ascending: false }).limit(5)
        ]);
        
        res.json({
            total_subscribers: totalSubscribers.count,
            verified_subscribers: verifiedSubscribers.count,
            recent_campaigns: recentCampaigns.data
        });
        
    } catch (error) {
        console.error('Newsletter stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add to server.js

// ==================== PUSH NOTIFICATION ENDPOINTS ====================
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:notifications@getedil.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Subscribe to push notifications
app.post('/api/push/subscribe', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError) throw authError;
    
    const subscription = req.body;
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        created_at: new Date()
      });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe from push notifications
app.post('/api/push/unsubscribe', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError) throw authError;
    
    const { endpoint } = req.body;
    
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send push notification to user
async function sendPushNotification(userId, title, body, url) {
  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (!subscriptions || subscriptions.length === 0) return;
    
    const payload = JSON.stringify({ title, body, url });
    
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          payload
        );
      } catch (error) {
        if (error.statusCode === 410) {
          // Subscription expired
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
  } catch (error) {
    console.error('Send push notification error:', error);
  }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 GETEDIL API running on port ${PORT}`);
    console.log(`📧 Email notifications enabled`);
    console.log(`📸 Image upload enabled`);
    console.log(`🔗 Related products endpoint enabled`);
    console.log(`🎟️ Coupon system enabled`);
    console.log(`📊 Seller analytics enabled`);
    console.log(`📤 Bulk upload enabled`);
});

module.exports = app;
