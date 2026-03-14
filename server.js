const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// ─── Socket.IO config optimised ─────────────────────────────────────────────
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 5e8 
});

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(express.static(path.join(__dirname, '.')));

// ─── MongoDB Connection ──────────────────────────────────────────────────────
const MONGO_URI = "mongodb+srv://harishkarthik672_db_user:m2lvRLHv0wV7yFev@tnpvcofficialwebsite.ikz3lb3.mongodb.net/tnpvc_db?retryWrites=true&w=majority&appName=tnpvcofficialwebsite";

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        migrateIfNeeded();
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── Schemas & Models ────────────────────────────────────────────────────────
const User = mongoose.model('User', new mongoose.Schema({
    userId: String, name: String, email: String, avatar: String, 
    shop: String, location: String, bio: String, setupComplete: Boolean
}, { timestamps: true }));

const Post = mongoose.model('Post', new mongoose.Schema({
    id: Number, user: String, avatar: String, media: [String], caption: String,
    likes: { type: Number, default: 0 }, likedBy: [String],
    comments: [{ user: String, text: String, avatar: String, time: String }],
    time: String
}, { timestamps: true }));

const Notification = mongoose.model('Notification', new mongoose.Schema({
    id: Number, from: String, fromAvatar: String, to: String, type: String, status: String, time: String
}, { timestamps: true }));

const Message = mongoose.model('Message', new mongoose.Schema({
    id: Number, from: String, to: String, text: String, time: String
}, { timestamps: true }));

const WorkUpdate = mongoose.model('WorkUpdate', new mongoose.Schema({
    id: Number, user: String, avatar: String, given: String, address: String, time: String
}, { timestamps: true }));

const Product = mongoose.model('Product', new mongoose.Schema({
    id: Number, user: String, name: String, price: String, contact: String, media: [String]
}, { timestamps: true }));

const Follower = mongoose.model('Follower', new mongoose.Schema({
    targetUser: String, followersList: [String]
}));

// ─── Migration Logic ────────────────────────────────────────────────────────
async function migrateIfNeeded() {
    const userCount = await User.countDocuments();
    if (userCount === 0 && fs.existsSync(DB_PATH)) {
        console.log('🔄 Migrating local db.json to MongoDB...');
        try {
            const raw = fs.readFileSync(DB_PATH, 'utf8');
            const data = JSON.parse(raw);
            if (data.all_users) await User.insertMany(data.all_users);
            if (data.posts) await Post.insertMany(data.posts);
            if (data.notifications) await Notification.insertMany(data.notifications);
            if (data.messages) await Message.insertMany(data.messages);
            if (data.work_updates) await WorkUpdate.insertMany(data.work_updates);
            if (data.prods) await Product.insertMany(data.prods);
            
            if (data.followers) {
                for (let target of Object.keys(data.followers)) {
                    await Follower.create({ targetUser: target, followersList: data.followers[target] });
                }
            }
            console.log('✅ Migration complete');
        } catch (e) {
            console.error('❌ Migration failed:', e.message);
        }
    }
}

// ─── Utility to fetch full state ─────────────────────────────────────────────
async function getFullState() {
    const all_users = await User.find().lean();
    const posts = await Post.find().sort({ createdAt: -1 }).lean();
    const notifications = await Notification.find().sort({ createdAt: -1 }).lean();
    const messages = await Message.find().lean();
    const work_updates = await WorkUpdate.find().sort({ createdAt: -1 }).lean();
    const prods = await Product.find().sort({ createdAt: -1 }).lean();
    const followersRaw = await Follower.find().lean();
    
    const followers = {};
    followersRaw.forEach(f => { followers[f.targetUser] = f.followersList; });

    return { all_users, posts, notifications, messages, work_updates, prods, followers };
}

const onlineUsers = {}; 

// ─── Socket.IO Events ────────────────────────────────────────────────────────
io.on('connection', async (socket) => {
    console.log('Connected:', socket.id);
    
    socket.emit('initial_sync', await getFullState());

    socket.on('user_online', (userName) => {
        if (userName) {
            onlineUsers[userName.trim()] = socket.id;
            socket.data.userName = userName.trim();
            io.emit('online_users', Object.keys(onlineUsers));
        }
    });

    socket.on('sync_user', async (userData) => {
        const name = (userData.name || '').trim();
        await User.findOneAndUpdate({ name }, userData, { upsert: true });
        io.emit('db_updated', { type: 'users', data: await User.find().lean() });
    });

    socket.on('create_post', async (postData) => {
        await Post.create(postData);
        io.emit('db_updated', { type: 'posts', data: await Post.find().sort({ createdAt: -1 }).lean() });
    });

    socket.on('create_product', async (prodData) => {
        await Product.create(prodData);
        io.emit('db_updated', { type: 'prods', data: await Product.find().sort({ createdAt: -1 }).lean() });
    });

    socket.on('create_work_update', async (updateData) => {
        await WorkUpdate.create(updateData);
        io.emit('db_updated', { type: 'work_updates', data: await WorkUpdate.find().sort({ createdAt: -1 }).lean() });
    });

    socket.on('send_notification', async (notifData) => {
        const from = (notifData.from || '').trim();
        const to = (notifData.to || '').trim();
        await Notification.deleteMany({ from, to, type: 'follow_request' });
        await Notification.create(notifData);
        io.emit('db_updated', { type: 'notifications', data: await Notification.find().sort({ createdAt: -1 }).lean() });
        
        if (onlineUsers[to]) io.to(onlineUsers[to]).emit('new_notification', notifData);
    });

    socket.on('accept_follow', async ({ notifId, from, to }) => {
        await Notification.findOneAndUpdate({ id: notifId }, { status: 'accepted' });
        const follower = await Follower.findOne({ targetUser: to });
        if (follower) {
            if (!follower.followersList.includes(from)) {
                follower.followersList.push(from);
                await follower.save();
            }
        } else {
            await Follower.create({ targetUser: to, followersList: [from] });
        }
        
        io.emit('db_updated', { type: 'notifications', data: await Notification.find().sort({ createdAt: -1 }).lean() });
        const followersRaw = await Follower.find().lean();
        const followers = {};
        followersRaw.forEach(f => { followers[f.targetUser] = f.followersList; });
        io.emit('db_updated', { type: 'followers', data: followers });
    });

    socket.on('remove_notification', async (notifId) => {
        await Notification.deleteOne({ id: notifId });
        io.emit('db_updated', { type: 'notifications', data: await Notification.find().sort({ createdAt: -1 }).lean() });
    });

    socket.on('unfollow', async ({ target, me }) => {
        const follower = await Follower.findOne({ targetUser: target });
        if (follower) {
            follower.followersList = follower.followersList.filter(f => f !== me);
            await follower.save();
        }
        await Notification.deleteMany({ from: me, to: target, type: 'follow_request' });
        
        const followersRaw = await Follower.find().lean();
        const followers = {};
        followersRaw.forEach(f => { followers[f.targetUser] = f.followersList; });
        io.emit('db_updated', { type: 'followers', data: followers });
        io.emit('db_updated', { type: 'notifications', data: await Notification.find().sort({ createdAt: -1 }).lean() });
    });

    socket.on('toggle_like', async ({ postId, liked, user }) => {
        const post = await Post.findOne({ id: postId });
        if (post) {
            if (liked) {
                if (!post.likedBy.includes(user)) post.likedBy.push(user);
            } else {
                post.likedBy = post.likedBy.filter(u => u !== user);
            }
            post.likes = post.likedBy.length;
            await post.save();
            io.emit('db_updated', { type: 'posts', data: await Post.find().sort({ createdAt: -1 }).lean() });
        }
    });

    socket.on('add_comment', async ({ postId, comment }) => {
        const post = await Post.findOne({ id: postId });
        if (post) {
            post.comments.push(comment);
            await post.save();
            io.emit('db_updated', { type: 'posts', data: await Post.find().sort({ createdAt: -1 }).lean() });
        }
    });

    socket.on('send_message', async (msgData) => {
        await Message.create(msgData);
        io.emit('db_updated', { type: 'messages', data: await Message.find().lean() });
        if (onlineUsers[msgData.to]) io.to(onlineUsers[msgData.to]).emit('incoming_message', msgData);
    });

    socket.on('delete_post', async (id) => {
        await Post.deleteOne({ id });
        io.emit('db_updated', { type: 'posts', data: await Post.find().sort({ createdAt: -1 }).lean() });
    });

    socket.on('delete_product', async (id) => {
        await Product.deleteOne({ id });
        io.emit('db_updated', { type: 'prods', data: await Product.find().sort({ createdAt: -1 }).lean() });
    });

    socket.on('delete_work_update', async (id) => {
        await WorkUpdate.deleteOne({ id });
        io.emit('db_updated', { type: 'work_updates', data: await WorkUpdate.find().sort({ createdAt: -1 }).lean() });
    });

    socket.on('delete_user', async (userId) => {
        await User.deleteOne({ userId });
        io.emit('db_updated', { type: 'users', data: await User.find().lean() });
    });

    socket.on('disconnect', () => {
        const name = socket.data.userName;
        if (name && onlineUsers[name] === socket.id) {
            delete onlineUsers[name];
            io.emit('online_users', Object.keys(onlineUsers));
        }
    });
});

app.get('/ping', (req, res) => res.send('pong ' + new Date().toLocaleTimeString()));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TNPVC Server with MongoDB running on port ${PORT}`);
});
