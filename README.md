# Semantix Backend

A detailed overview of the project has been given here.  
Please click to know more - https://github.com/Mithilesh-1405/semantix-hub

---

## Architecture

### PDF Search

One of the main features of Semantix is **PDF Search**. In short, this PDF search will find the meaning of your search query in the PDF and highlight the matched text.

---

#### 1. Parameters

This PDF search pipeline accepts **2 main parameters**:

1. **Uploaded PDF**
2. **Search Query**

Under the hood, this pipeline will accept:

- `pdf`
- `search_query`
- `pdf_id`
- `user_id`

*(since this is user specific)*

---

#### 2. Document Loading

Once we have the PDF, we will extract the text page wise using a PDF parser and store them in the `Document` objects of LangChain module along with other attributes like:

- `content`
- `page_number`
- `pdf_id`

---

#### 3. Character Splitting

Long texts are then split into smaller chunks of custom size using a `RecursiveCharacterTextSplitter`.

This specific splitter is best suited for PDF because of the way it is formatted.

---

#### 4. Document Embedding

These document chunks are then converted to vectors and stored in a vector database using Supabase's vector store, which can be queried later for the PDF search.

---

### Pipeline Flow

```text
Uploaded PDF + Search Query
            │
            ▼
     Document Loading
            │
            ▼
    Character Splitting
            │
            ▼
     Document Embedding
            │
            ▼
   Supabase Vector Store
            │
            ▼
      Semantic Search
            │
            ▼
     Highlight Results
```
