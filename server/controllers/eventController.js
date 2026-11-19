const Event = require('../models/Event');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.getEvents = async (req, res) => {
    try {
        const filters = {};
        if (req.query.category) filters.category = req.query.category;
        if (req.query.search) filters.title = { $regex: req.query.search, $options: 'i' };

        const events = await Event.find(filters).populate('createdBy', 'name email');
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('createdBy', 'name email');
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, location, category, totalSeats, ticketPrice, image } = req.body;
        const event = await Event.create({
            title,
            description,
            date,
            location,
            category,
            totalSeats,
            availableSeats: totalSeats,
            ticketPrice: ticketPrice || 0,
            image: image || '',
            createdBy: req.user.id
        });
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// AI Description Generator Controller using Google Gemini
exports.generateEventDescription = async (req, res) => {
    try {
        const { title, category, location, date } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Event title is required' });
        }

        const prompt = `Write an engaging, professional 3-sentence event description for an event booking platform.
        Title: ${title}
        Category: ${category || 'General'}
        Location: ${location || 'TBA'}
        Date: ${date || 'Upcoming'}
        Return ONLY valid JSON in this exact format: {"description": "..."}`;

        let response;
        let retries = 3;
        let delay = 1000;

        // Retry loop to handle temporary 503 high demand spikes gracefully
        for (let i = 0; i < retries; i++) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json'
                    }
                });
                break; // Success, exit retry loop
            } catch (err) {
                if (err.status === 503 && i < retries - 1) {
                    console.warn(`Gemini 503 High Demand. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                } else {
                    throw err; // Re-throw if it's not a 503 or we ran out of retries
                }
            }
        }

        const textResponse = typeof response.text === 'function' ? response.text() : response.text;
        console.log('Gemini AI Raw Response:', textResponse);
        const aiData = JSON.parse(textResponse);
        console.log('Gemini AI Parsed Data:', aiData);
        
        res.status(200).json({ description: aiData.description });
    } catch (error) {
        console.error('Gemini AI Generation Error:', error);
        res.status(500).json({ message: 'AI service is temporarily busy. Please try clicking generate again in a moment.', error: error.message });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};