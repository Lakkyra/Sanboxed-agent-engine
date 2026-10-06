import api from './api';

export const ragService = {
    /**
     * Uploads a file for RAG ingestion.
     * @param {File} file - The file to upload.
     * @returns {Promise<Object>} - The ingestion strategy and status.
     */
    async uploadFile(file, documentType = "Auto (Detect)") {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);

        try {
            // Note: api instance usually handles auth headers
            const response = await api.post('/api/v1/ingest/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('RAG Upload Error:', error);
            throw error;
        }
    },

    /**
     * Polls the status of an ingestion job.
     * @param {string} jobId - The ID of the job to poll.
     * @returns {Promise<Object>} - The job status.
     */
    async pollIngestionJob(jobId) {
        try {
            const response = await api.get(`/api/v1/ingest/job/${jobId}`);
            return response.data;
        } catch (error) {
            console.error('Job Polling Error:', error);
            throw error;
        }
    },

    /**
     * Lists this user's recent ingestion jobs (last 20, newest first),
     * regardless of whether the upload modal that started them is still
     * open — used for a persistent "what's happening with my uploads"
     * status view. Unlike pollIngestionJob, doesn't require already
     * knowing a job_id.
     * @returns {Promise<Object>} - { jobs: [...] }
     */
    async listJobs() {
        try {
            const response = await api.get('/api/v1/ingest/jobs');
            return response.data;
        } catch (error) {
            console.error('List Jobs Error:', error);
            return { jobs: [] };
        }
    },

    /**
     * Sends a message to the Agentic RAG Chat.
     * @param {string} message - User query.
     * @param {Array<string>} selectedFileIds - Optional list of file UUIDs to filter by.
     * @returns {Promise<Object>} - Answer, sources, hallucination_warning.
     */
    async chat(message, selectedFileIds = []) {
        try {
            const payload = { message };
            if (selectedFileIds && selectedFileIds.length > 0) {
                payload.selected_file_ids = selectedFileIds;  // backend field name
            }
            const response = await api.post('/api/v1/rag/chat', payload);
            return response.data;
        } catch (error) {
            console.error('RAG Chat Error:', error);
            throw error;
        }
    },

    /**
     * Tool: Reads a specific page from DocStore.
     * @param {string} docId - MongoDB ID of the document.
     * @param {number} page - Page number.
     * @returns {Promise<Object>} - Page content.
     */
    async readPage(docId, page) {
        try {
            const response = await api.post('/api/v1/rag/read-page', { doc_id: docId, page: parseInt(page) });
            return response.data;
        } catch (error) {
            console.error('Tool Error (Read Page):', error);
            throw error;
        }
    },

    /**
     * Lists available source files in the Knowledge Base.
     * @returns {Promise<Object>} - { files: ["a.pdf", "b.pdf"] }
     */
    async listFiles() {
        try {
            const response = await api.get('/api/v1/rag/files');
            return response.data;
        } catch (error) {
            console.error('List Files Error:', error);
            return { files: [] };
        }
    },

    /**
     * Deletes a file from the knowledge base.
     * @param {string} fileId - UUID of the file.
     */
    async deleteFile(fileId) {
        try {
            const response = await api.delete(`/api/v1/rag/file/${fileId}`);
            return response.data;
        } catch (error) {
            console.error('Delete File Error:', error);
            throw error;
        }
    }
};
