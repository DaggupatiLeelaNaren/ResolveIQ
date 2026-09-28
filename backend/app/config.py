from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://resolveiq:resolveiq@localhost:5432/resolveiq"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    hindsight_url: str = "https://api.hindsight.vectorize.io"
    hindsight_api_key: str = ""
    hindsight_bank_id: str = "resolveiq-incidents"
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
