from flask import Flask, render_template, jsonify, request
from src.helper import download_hugging_face_embeddings
from langchain_pinecone import PineconeVectorStore
from dotenv import load_dotenv
from src.prompt import *
import os
import google.generativeai as genai

app = Flask(__name__)

load_dotenv()

PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY

os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel("gemini-2.5-flash")

embeddings = download_hugging_face_embeddings()


index_name = "medical-chatbot"

# Embed each chunk upsert the embeddings into your Pinecone index.
docsearch = PineconeVectorStore.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)

retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 3})

def rag_pipeline(query: str) -> str:
    docs = retriever.get_relevant_documents(query)
    context = "\n".join([doc.page_content for doc in docs])
    full_prompt = f"{system_prompt}\n\nContext:\n{context}\n\nUser: {query}"
    response = model.generate_content(full_prompt)
    return response.text or "I could not generate a response."


@app.route("/")
def index():
    return render_template('index.html')


@app.route("/get", methods=["GET", "POST"])
def chat():
    msg = request.form.get("msg", "").strip()
    if not msg:
        return "Please enter a message."

    print(msg)
    response = rag_pipeline(msg)
    print("Response: ", response)
    return str(response)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
