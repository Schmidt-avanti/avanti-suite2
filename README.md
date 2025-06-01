# Avanti Suite

Avanti Suite is a comprehensive customer service and task management platform featuring AVA, an AI-powered assistant for service agents.

## Key Features

- **Intelligent Task Management**: Create, assign, and track customer service tasks
- **AI-Powered Assistance**: AVA provides context-aware suggestions to agents based on use cases
- **Knowledge Base Integration**: Access and utilize knowledge articles for consistent service
- **Customer Communication**: Handle customer inquiries via email, chat, and other channels
- **Analytics & Reporting**: Track performance metrics and gain insights

## Technical Overview

- **Frontend**: React with TypeScript, Shadcn UI components
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI Integration**: OpenAI for embeddings and response generation
- **Communication**: Twilio integration for voice/messaging

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- Supabase account (for backend services)
- OpenAI API key (for AI features)

### Installation

```sh
# Clone the repository
git clone <REPOSITORY_URL>

# Navigate to project directory
cd avanti-suite

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Setup

Create a `.env` file with the following variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Core Workflows

### 1. Task Creation

Agents can create tasks through multiple entry points:
- **Manual Creation**: Service agents create tasks via the web interface by:
  - Selecting a customer
  - Optionally selecting an end customer (Endkunde)
  - Entering a detailed task description
  - Submitting the form to create the task

- **Automated Sources**:
  - **Email Integration**: Incoming customer emails are automatically converted to tasks
  - **Call Center Integration**: Phone calls can generate associated tasks
  - **Chat/WhatsApp**: Conversations can be escalated to tasks

Each task is assigned a unique ID, timestamps, and is initially assigned to the creating agent with a "new" status.

### 2. Use Case Matching

When a task is created, the system automatically analyzes it to find the most relevant use case:

- **Text Analysis**: The task description is processed and converted to an embedding vector
- **Similarity Search**: The system performs a vector similarity search against the use case database
- **Confidence Scoring**: Each potential match is assigned a confidence score
- **Selection**: The highest-scoring use case above the threshold is selected and linked to the task
- **Fallback Handling**: If no suitable match is found, the system can route the task to a special queue (e.g., KVP team)

The match result includes the selected use case ID, confidence score, and reasoning for the match.

### 3. AI Assistance (AVA)

Once a use case is matched, AVA provides contextual assistance:

- **Initial Response**: AVA automatically generates an initial response based on the matched use case
- **Contextual Guidance**: AVA suggests next steps and questions based on the use case's requirements
- **Information Retrieval**: For knowledge-based requests, AVA pulls relevant information from the knowledge base
- **Structured Flow**: AVA guides the agent through the appropriate workflow based on use case type:
  - Direct handling (for straightforward tasks)
  - Knowledge requests (for information-seeking tasks)
  - Forwarding workflows (when escalation is needed)
  
- **Dynamic Adaptation**: As the agent interacts with the customer, AVA continues to provide relevant suggestions

### 4. Task Resolution

Agents work through tasks to completion:

- **Information Collection**: Agents gather required information from the customer
- **Action Taking**: Agents perform necessary actions guided by AVA's suggestions
- **Documentation**: Key actions and information are recorded in the task history
- **Status Updates**: Task status is updated throughout the process (new → in progress → completed)
- **Handoff (when needed)**: Tasks can be reassigned or forwarded to other teams with contextual information
- **Closure**: When the customer's needs are met, the agent closes the task with appropriate documentation
- **Time Tracking**: The system logs handling time and other metrics for reporting

### 5. Analytics and Learning

The system continuously improves:

- **Performance Metrics**: Track agent efficiency, resolution times, and customer satisfaction
- **Use Case Refinement**: Identify gaps in use case coverage and refine existing use cases
- **AI Improvement**: AVA's responses are refined based on agent feedback and usage patterns

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/942bb8b4-2212-43ab-a451-62e99e391cfe) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
