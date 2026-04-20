const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const IG_APP_ID = "936619743392459";

// Helper for IG Headers
const getHeaders = (sessionid) => ({
    "Cookie": `sessionid=${sessionid}`,
    "X-IG-App-ID": IG_APP_ID,
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
    "Accept": "*/*"
});

// Endpoint: Scan (Followers vs Following)
app.post('/api/scan', async (req, res) => {
    const { sessionid } = req.body;
    try {
        // 1. Get My ID
        const me = await axios.get('https://www.instagram.com/api/v1/users/web_profile_info/?username=self', { headers: getHeaders(sessionid) });
        const myId = me.data.data.user.id;

        // 2. Get Following
        const following = await axios.get(`https://www.instagram.com/api/v1/friendships/${myId}/following/?count=500`, { headers: getHeaders(sessionid) });
        
        // 3. Get Followers
        const followers = await axios.get(`https://www.instagram.com/api/v1/friendships/${myId}/followers/?count=500`, { headers: getHeaders(sessionid) });

        const followerIds = new Set(followers.data.users.map(u => u.pk));
        const nonFollowers = following.data.users.filter(u => !followerIds.has(u.pk));

        res.json({ success: true, users: nonFollowers });
    } catch (error) {
        res.status(500).json({ success: false, error: "Auth Failed or Rate Limited" });
    }
});

// Endpoint: Unfollow Action
app.post('/api/unfollow', async (req, res) => {
    const { sessionid, targetId } = req.body;
    try {
        await axios.post(`https://www.instagram.com/api/v1/friendships/destroy/${targetId}/`, {}, { headers: getHeaders(sessionid) });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

module.exports = app;
