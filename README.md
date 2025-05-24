
# Career Spark

Career Spark is an AI-powered tool designed to assist users with their career development. It provides features such as personalized job recommendations, resume analysis, and contextual job information, leveraging artificial intelligence to streamline the job search process.

## Setup

To set up the project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd career-spark
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of your project and add your SerpApi API key:
    ```env
    SERPAPI_API_KEY=your_serpapi_api_key_here
    ```
    You can get a SerpApi key from [SerpApi.com](https://serpapi.com/).

4.  **Run the development server:**
    For the Next.js app:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will typically start the app on `http://localhost:9002`.

    For Genkit development (optional, for inspecting flows):
    ```bash
    npm run genkit:dev
    # or
    yarn genkit:dev
    ```

## AI Features and Architecture

This project leverages several AI techniques and tools, primarily orchestrated using the Genkit framework, to provide its core functionalities.

### 1. Genkit Framework

[Genkit](https://firebase.google.com/docs/genkit) (by Google) is the backbone for all AI operations. It's used to define, manage, and run AI flows, prompts, and tools, providing a structured way to build generative AI applications. We use it with the Google AI provider (Gemini models).

### 2. Generative AI Models (Gemini)

The application primarily uses Google's Gemini family of models (e.g., Gemini Flash) through Genkit for various tasks:
*   **Natural Language Understanding & Generation**: For processing user queries, generating summaries, explanations, and chat responses.
*   **Structured Data Extraction**: For parsing resumes and formatting outputs according to predefined schemas.
*   **Decision Making**: For classifying user intent and deciding on search strategies for job recommendations.

### 3. Core AI Flows

AI flows are defined using Genkit to encapsulate specific AI-driven tasks:

*   **Resume Parsing (`parseResume`)**:
    *   **Input**: Resume file (PDF/DOCX) as a data URI.
    *   **Process**: Uses a multimodal prompt with Gemini to extract key information such as skills, work experience, and education.
    *   **Output**: Structured JSON data containing the extracted details (skills, experience, education arrays).

*   **Intent Classification (`classifyUserIntent`)**:
    *   **Input**: User's chat query (string).
    *   **Process**: Uses a Gemini model with a specialized prompt to classify the user's intent as either `'job_search'` or `'general_question'`. This helps route the query to the appropriate downstream flow.
    *   **Output**: An object indicating the classified intent (e.g., `{ intent: 'job_search' }`).

*   **Job Recommendation (`jobRecommendation`)**:
    *   **Input**: Parsed resume text and user's job search preferences/query.
    *   **Process**:
        1.  The LLM analyzes the resume and user query to formulate an optimal search string.
        2.  It then invokes the `searchJobsTool` to fetch relevant job listings from the web (via SerpApi).
        3.  The LLM evaluates the search results against the user's profile, generates a personalized summary explaining the match, and assigns a relevance score.
    *   **Output**: A list of recommended jobs (up to 5), including details like ID, title, company, location, personalized summary, relevance score, and direct URL. It also includes the search query used and feedback if no results were found.

*   **Contextual Job Helper / RAG (`contextualJobHelper`)**:
    *   **Input**: User's query and optionally, the parsed resume text.
    *   **Process**: This flow implements a Retrieval Augmented Generation (RAG) pattern.
        1.  It uses the `relevantInfoRetrieverTool` (currently mock) to fetch context snippets relevant to the user's query.
        2.  If the query is about the user's resume and resume text is provided, that text is prioritized as context.
        3.  It then prompts Gemini with the original query, the retrieved snippets, and (if relevant) the resume text, instructing it to answer based on the provided information and its general knowledge as a career advisor.
    *   **Output**: An AI-generated answer to the user's query, and optionally the list of retrieved context items.

### 4. AI Tools (Genkit Tools)

Tools extend the LLM's capabilities by allowing it to interact with external systems or perform specific tasks:

*   **Job Search Tool (`searchJobsTool`)**:
    *   **Purpose**: Fetches real-time job listings from the web.
    *   **Implementation**: Uses the SerpApi Google Jobs API. It performs a two-step search:
        1.  Initial search (`engine=google_jobs`) to get a list of jobs and their `job_id`s.
        2.  For each `job_id`, a detailed listing search (`engine=google_jobs_listing`) is made to retrieve `apply_options` which provide direct application links.
    *   **Output**: An array of job objects, each containing details like ID, title, company, location, description, URL, posted date, and employment type.

*   **Relevant Info Retriever Tool (`relevantInfoRetrieverTool`)**:
    *   **Purpose**: Simulates fetching relevant document snippets for the RAG flow.
    *   **Implementation**: Currently uses a predefined mock knowledge base of common job-seeking advice. In a production system, this would typically query a vector database containing embedded documents about career advice, job search strategies, etc.
    *   **Output**: An array of text snippets relevant to the input query.

### 5. Schema Definition and Validation

[Zod](https://zod.dev/) is used extensively with Genkit to define the input and output schemas for all AI flows, prompts, and tools. This ensures data consistency, provides type safety, and helps guide the LLM in generating structured output according to the expected format. Genkit uses these schemas for validation at runtime.

## Development Journey: Challenges & Solutions

Building this AI-powered application involved an iterative process, tackling several common challenges:

1.  **LLM Adherence to Output Schemas**:
    *   **Challenge**: Large Language Models (LLMs) sometimes struggle to consistently produce JSON output that perfectly matches a predefined Zod schema, especially concerning optional fields (e.g., outputting `null` instead of omitting a field or using an incorrect data type).
    *   **Solution**: This was addressed through:
        *   **Iterative Prompt Engineering**: Refining prompt instructions to be extremely explicit about data types, required fields, and how to handle optional data (e.g., "Omit this field entirely if no valid URL is available. Do not use `null`.").
        *   **Schema Adjustments & Data Transformation**: In cases where prompt engineering alone wasn't sufficient (like the LLM consistently outputting `null` for an optional field intended to be `string | undefined`), the Zod schema was temporarily adjusted to accept `nullable()`. Then, a transformation step was added in the TypeScript flow code to convert these `null` values to `undefined` before the final output, ensuring the flow's contract with the rest of the application remained consistent.

2.  **Accurate User Intent Classification**:
    *   **Challenge**: Initially, simple keyword or regex-based heuristics for classifying user intent (e.g., "is this a job search or a general question?") proved insufficient for nuanced queries like "give me a roadmap for AI engineer."
    *   **Solution**: A dedicated Genkit flow (`classifyUserIntent`) was implemented. This flow uses a Gemini model with a carefully crafted prompt and examples to perform a more robust, AI-powered classification of the user's query.

3.  **Fetching Relevant and Actionable Job URLs**:
    *   **Challenge**: Simply extracting the first link from a job search API result often doesn't lead to the direct application page or the most useful posting.
    *   **Solution**: The `searchJobsTool` was enhanced to use a two-step process with SerpApi's Google Jobs integration:
        1.  An initial search (`engine=google_jobs`) to retrieve a list of jobs and their `job_id`s.
        2.  For each promising `job_id`, a secondary, more detailed lookup (`engine=google_jobs_listing`) is performed to access the `apply_options` array, which contains more direct links to application pages on LinkedIn, company websites, etc. Logic was added to prioritize these `apply_options` links.

4.  **RAG Flow Providing Comprehensive Answers**:
    *   **Challenge**: An initial RAG implementation might too strictly limit the LLM to only use the retrieved context snippets, resulting in answers that are less detailed than expected for general knowledge questions (e.g., "how to improve my resume?").
    *   **Solution**: The prompt for the RAG flow (`contextualJobHelper`) was adjusted. Instead of instructing the LLM to *only* use the provided snippets, it was guided to use the snippets as a starting point or supplement, but also to leverage its broader knowledge as a "Career Advisor AI" to provide a comprehensive and helpful answer, especially if snippets were insufficient.

5.  **Handling UI/UX for Asynchronous AI Responses**:
    *   **Challenge**: Ensuring the chat interface remains responsive, displays loading states, handles errors gracefully, and presents structured AI output (like job cards or formatted text) effectively.
    *   **Solution**:
        *   Implemented loading skeletons and disabled input fields during AI processing.
        *   Added error handling in API calls and displayed user-friendly error messages/toasts.
        *   Developed specific rendering logic for AI messages, including parsing basic Markdown (like bold text) and displaying job recommendations as interactive cards within the chat.
        *   Managed component state carefully to reflect resume availability and other contextual information.

6.  **Frontend and Backend Data Synchronization (Resume Parsing)**:
    *   **Challenge**: Ensuring that once a resume is uploaded and parsed on the backend, the frontend (specifically the `ChatInterface`) is immediately aware of this new resume context.
    *   **Solution**: The `ResumeUploadForm` component dispatches a custom browser event (`resumeUpdated`) after successful parsing and storing the data in `localStorage`. The `ChatInterface` listens for this event and re-loads the resume data, triggering an updated AI greeting if appropriate.

7.  **Debugging Syntax Errors in Prompts**:
    *   **Challenge**: JavaScript parsing errors occurred due to special characters (like backticks intended for Markdown emphasis) within the template literals defining LLM prompts.
    *   **Solution**: Identified and corrected these syntax issues by replacing the problematic characters with alternatives that are valid within JavaScript strings (e.g., using single quotes for emphasis inside a backtick-delimited template literal).

This iterative process of identifying issues, refining prompts, adjusting code logic, and improving UI feedback was crucial to developing the application.

## Tech Stack

*   **Framework**: Next.js (App Router)
*   **AI Orchestration**: Genkit
*   **AI Models**: Google Gemini (via Genkit Google AI Plugin)
*   **Styling**: Tailwind CSS
*   **UI Components**: ShadCN UI
*   **Language**: TypeScript
*   **Job Search API**: SerpApi (Google Jobs)

## Key Features

*   **AI-Powered Resume Analysis**: Upload your resume (PDF/DOCX) and see an ATS-like view of extracted skills, experience, and education.
*   **Intelligent Chat Assistant**:
    *   Ask for personalized job recommendations based on your resume and queries.
    *   Get answers to general career questions, interview tips, and more using a RAG-enhanced AI.
*   **Real-time Job Search**: Fetches current job openings using the SerpApi.
*   **Detailed Job View**: Click on a job suggestion in the chat to see more details in a modal.

    