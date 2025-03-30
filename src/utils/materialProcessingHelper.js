const axios = require('axios');
const pdfParse = require('pdf-parse');
const { AssemblyAI } = require('assemblyai');
const cheerio = require('cheerio');
const { httpStatusCodes, messages } = require('./httpStatusCodes');
const config = require('../config/appConfig'); // ✅ Uses appConfig for API keys

//  Initialize AssemblyAI client
const assemblyaiClient = new AssemblyAI({
    apiKey: config.assemblyaiApi, // Using AssemblyAI API key from appConfig
});

/**
 * Extracts text from an audio file using AssemblyAI API
 * @param {string} fileUrl - URL of the audio file
 * @returns {Promise<{ status: number, message: string, data?: string }>}
 */
const extractTextFromAudio = async (fileUrl) => {
    try {
        if (!fileUrl) {
            return {
                status: httpStatusCodes.BAD_REQUEST,
                message: messages.INVALID_AUDIO_URL,
            };
        }

        //  Transcribe the audio using AssemblyAI
        const data = { audio: fileUrl };
        const transcript = await assemblyaiClient.transcripts.transcribe(data);

        //  Extract transcribed text
        if (transcript.text) {
            return {
                status: httpStatusCodes.OK,
                message: messages.TRANSCRIPTION_SUCCESS,
                data: transcript.text,
            };
        }

        return {
            status: httpStatusCodes.BAD_REQUEST,
            message: messages.NO_TRANSCRIPTION_FOUND,
        };
    } catch (error) {
        return {
            status: httpStatusCodes.INTERNAL_SERVER_ERROR,
            message: messages.TRANSCRIPTION_ERROR,
        };
    }
};

/**
 * Extracts text from a PDF file
 * @param {string} fileUrl - URL of the PDF file
 * @returns {Promise<{ status: number, message: string, data?: string }>}
 */
const extractTextFromPDF = async (fileUrl) => {
    try {
        if (!fileUrl) {
            return {
                status: httpStatusCodes.BAD_REQUEST,
                message: messages.INVALID_PDF_URL,
            };
        }

        // ✅ Download and parse the PDF
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(response.data);
        const parsedData = await pdfParse(pdfBuffer);

        if (!parsedData.text) {
            return {
                status: httpStatusCodes.BAD_REQUEST,
                message: messages.NO_TEXT_FOUND_IN_PDF,
            };
        }

        return {
            status: httpStatusCodes.OK,
            message: messages.PDF_EXTRACTION_SUCCESS,
            data: parsedData.text,
        };
    } catch (error) {
        return {
            status: httpStatusCodes.INTERNAL_SERVER_ERROR,
            message: messages.PDF_EXTRACTION_ERROR,
        };
    }
};

/**
 * Extracts text from a web link using Cheerio
 * @param {string} url - URL of the webpage
 * @returns {Promise<{ status: number, message: string, data?: string }>}
 */
const extractTextFromWebLink = async (url) => {
    try {
        if (!url) {
            return {
                status: httpStatusCodes.BAD_REQUEST,
                message: messages.INVALID_WEB_URL,
            };
        }

        // ✅ Fetch the webpage content
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });

        const $ = cheerio.load(response.data);

        // ✅ Extract title
        const title = $('title').text().trim();

        // ✅ Extract the first 5 paragraphs
        const paragraphs = [];
        $('p')
            .slice(0, 5)
            .each((i, elem) => {
                paragraphs.push($(elem).text().trim());
            });

        // Combine extracted content
        const extractedText = `Title: ${title}\n\n${paragraphs.join('\n\n')}`;
      

        if (!extractedText.trim()) {
            return {
                status: httpStatusCodes.BAD_REQUEST,
                message: messages.NO_TEXT_FOUND_IN_WEBPAGE,
            };
        }

        return {
            status: httpStatusCodes.OK,
            message: messages.WEBPAGE_EXTRACTION_SUCCESS,
            data: extractedText,
        };
    } catch (error) {
        return {
            status: httpStatusCodes.INTERNAL_SERVER_ERROR,
            message: messages.WEBPAGE_EXTRACTION_ERROR,
        };
    }
};

module.exports = { extractTextFromPDF, extractTextFromAudio, extractTextFromWebLink };
