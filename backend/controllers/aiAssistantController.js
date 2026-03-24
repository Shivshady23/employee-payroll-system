const {
  GoogleGenAI,
  createPartFromFunctionResponse,
  createUserContent
} = require("@google/genai");

const { geminiFunctionDeclarations } = require("../utils/aiTools");
const { executeAITool } = require("../utils/executeAITool");

const SYSTEM_PROMPT = `You are a smart HR and payroll assistant built into the Employee Payroll System.
You help admins and superadmins manage employees, understand salary structures, and get payroll insights.

Your capabilities:
- Query live employee and salary data from the database using tools
- Create or update salary structures for employees
- Explain PF, ESIC, pension calculations with exact numbers
- Find employees with missing salary, or employees who joined recently
- Draft professional HR emails (welcome emails, offer letters, reminders)
- Summarize payroll data and give actionable insights

PF/ESIC Rules you follow exactly:
- Employee PF = 12% of Basic salary
- Employer PF = 12% of Basic (split: 3.67% EPF + 8.33% Pension)
- ESIC applicable only if total earnings <= INR 21,000/month
- Employee ESIC = 0.75% of total earnings
- Employer ESIC = 3.25% of total earnings
- Net Pay = Total Earnings - Employee PF - Employee ESIC

Tone: Professional, concise, and helpful. When showing numbers, use INR with comma formatting.
When listing employees, use a clean table-style format in markdown.
Always confirm before creating or modifying data.`;

const MAX_TOOL_LOOPS = 8;

const normalizeIncomingMessages = messages =>
  messages
    .filter(item => item && (item.role === "user" || item.role === "assistant"))
    .map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: typeof item.content === "string" ? item.content : JSON.stringify(item.content)
        }
      ]
    }));

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

const getFunctionCallsFromResponse = response => {
  if (Array.isArray(response?.functionCalls)) {
    return response.functionCalls;
  }

  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter(part => part?.functionCall)
    .map(part => part.functionCall)
    .filter(Boolean);
};

exports.chat = async (req, res) => {
  try {
    const { messages } = req.body;
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY (or GOOGLE_API_KEY) is missing on the server"
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: "messages array required"
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    let contents = normalizeIncomingMessages(messages);
    let finalResponse = "";
    let loopCount = 0;

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount += 1;

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: geminiFunctionDeclarations }],
          maxOutputTokens: 1024
        }
      });

      const replyText = (response?.text || "").trim();
      if (replyText) {
        finalResponse = replyText;
      }

      const functionCalls = getFunctionCallsFromResponse(response);
      if (!functionCalls.length) {
        break;
      }

      const modelContent = response?.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      }

      const functionResponseParts = [];
      for (let index = 0; index < functionCalls.length; index += 1) {
        const functionCall = functionCalls[index] || {};
        const toolName = functionCall.name;
        const toolInput = functionCall.args || {};

        if (!toolName) {
          continue;
        }

        const result = await executeAITool(toolName, toolInput, {
          performedBy: req.user?.id || null
        });

        functionResponseParts.push(
          createPartFromFunctionResponse(
            functionCall.id || `${toolName}-${loopCount}-${index}`,
            toolName,
            result
          )
        );
      }

      if (!functionResponseParts.length) {
        break;
      }

      contents.push(createUserContent(functionResponseParts));
    }

    return res.status(200).json({
      success: true,
      reply:
        finalResponse ||
        "I could not generate a response right now. Please try rephrasing your request."
    });
  } catch (err) {
    console.error("AI Assistant error:", err);
    return res.status(500).json({
      success: false,
      message: "AI assistant error",
      error: err.message
    });
  }
};
