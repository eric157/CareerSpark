
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
