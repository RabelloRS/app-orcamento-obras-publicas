import secrets
import os

def generate_secret_key():
    """Gera uma SECRET_KEY segura e adiciona ao .env se nÃ£o existir"""
    
    secret_key = secrets.token_urlsafe(48)
    env_file = ".env"
    
    print(f"🔑 Gerando nova SECRET_KEY segura...")
    
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            content = f.read()
            
        if "SECRET_KEY=" in content:
            print("⚠️  SECRET_KEY jÃ¡ existe no arquivo .env!")
            print(f"   Se deseja trocar, edite manualmente ou remova a linha.")
            print(f"   Nova chave sugerida: {secret_key}")
            return
            
        with open(env_file, "a") as f:
            f.write(f"\nSECRET_KEY={secret_key}\n")
            print("✅ SECRET_KEY adicionada ao arquivo .env com sucesso!")
            
    else:
        print("⚠️  Arquivo .env nÃ£o encontrado. Criando novo arquivo a partir de .env.example...")
        if os.path.exists(".env.example"):
            with open(".env.example", "r") as f_ex:
                example_content = f_ex.read()
            
            with open(env_file, "w") as f_new:
                f_new.write(example_content)
                f_new.write(f"\nSECRET_KEY={secret_key}\n")
            print("✅ Arquivo .env criado com SECRET_KEY!")
        else:
            print("❌ Arquivo .env.example nÃ£o encontrado. Criando .env apenas com a chave.")
            with open(env_file, "w") as f_new:
                f_new.write(f"SECRET_KEY={secret_key}\n")
            print("✅ Arquivo .env criado!")

    print(f"\nChave gerada: {secret_key}")

if __name__ == "__main__":
    generate_secret_key()
