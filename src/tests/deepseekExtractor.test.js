const axios = require('axios');
// const pdfParse = require('pdf-parse');
const { extractTextFromAudio} = require('./deepseekExtractor');

jest.mock('axios'); // Mock axios to prevent real API calls
// jest.mock('pdf-parse'); // Mock pdf-parse to prevent real PDF parsing

describe('DeepSeek API Tests', () => {
    // ✅ Test extractTextFromAudio
    test('should extract text from an audio file using DeepSeek API', async () => {
        const mockFileUrl = 'https://example.com/audio.mp3';
        const mockResponse = { data: { transcription: 'Hello, this is a test transcription.' } };

        axios.post.mockResolvedValue(mockResponse);

        const result = await extractTextFromAudio(mockFileUrl);
        expect(result).toBe('Hello, this is a test transcription.');
    });

    test('should return null when DeepSeek API fails', async () => {
        axios.post.mockRejectedValue(new Error('DeepSeek API Error'));

        const result = await extractTextFromAudio('https://andrewai.s3.amazonaws.com/course-materials/67d20a58fabbb67a2d1ed68f/neural.mp3');
        expect(result).toBeNull();
    });

    // ✅ Test extractTextFromPDF
    // test('should extract text from a PDF file', async () => {
    //     const mockFileUrl = 'https://andrewai.s3.us-west-2.amazonaws.com/course-materials/67d20a58fabbb67a2d1ed68f/neural_network.pdf';
    //     const mockPdfText = 'This is a sample PDF text.';

    //     axios.get.mockResolvedValue({ data: Buffer.from('PDF binary data') });
    //     pdfParse.mockResolvedValue({ text: mockPdfText });

    //     const result = await extractTextFromPDF(mockFileUrl);
    //     expect(result).toBe(mockPdfText);
    // });

    // test('should return null when PDF extraction fails', async () => {
    //     axios.get.mockRejectedValue(new Error('PDF download error'));

    //     const result = await extractTextFromPDF('https://andrewai.s3.us-west-2.amazonaws.com/course-materials/67d20a58fabbb67a2d1ed68f/neural_network.pdf');
    //     expect(result).toBeNull();
    // });
});
