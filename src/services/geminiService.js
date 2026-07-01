const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getSongRecommendations = async ({ audio }) => {
	const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

	const prompt = `Given a song with these audio characteristics: ${JSON.stringify(audio, null, 2)}, suggest 5 similar songs that a listener might enjoy. For each song, provide the artist name, song title, and a brief reason why it matches. Respond with only a JSON array, no markdown, where each element has "artist", "title", and "reason" fields.`;

	const result = await model.generateContent(prompt);
	const text = result.response.text().trim();

	const jsonMatch = text.match(/\[[\s\S]*\]/);
	return JSON.parse(jsonMatch ? jsonMatch[0] : text);
};

module.exports = { getSongRecommendations };
