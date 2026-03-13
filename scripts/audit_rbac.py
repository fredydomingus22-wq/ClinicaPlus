import os
import re

# audit_rbac.py
# Analisa as rotas e gera um relatório de permissões

routes_dir = r"C:\Users\LENOVO\Documents\Projectos\ClinicaPlus\apps\api\src\routes"
report_file = r"C:\Users\LENOVO\Documents\Projectos\ClinicaPlus\apps\api\rbac_audit_report.txt"

def audit_routes():
    print("Iniciando Auditoria RBAC...")
    results = []
    
    for root, dirs, files in os.walk(routes_dir):
        for file in files:
            if file.endswith(".ts"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Procura por rotas e seus respectivos requireRole (padrão real do projeto)
                    matches = re.findall(r"router\.(get|post|put|patch|delete)\(['\"](.+?)['\"].+?requireRole\(\[(.+?)\]\)", content, re.DOTALL)
                    for method, endpoint, roles in matches:
                        # Limpa roles (ex: Papel.ADMIN -> ADMIN)
                        clean_roles = roles.replace('Papel.', '').strip()
                        results.append(f"{method.upper()} {file} -> {endpoint} (Roles: [{clean_roles}])")

    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("RELATÓRIO DE AUDITORIA RBAC\n")
        f.write("="*30 + "\n")
        for res in results:
            f.write(res + "\n")
            
    print(f"Relatório gerado em: {report_file}")

if __name__ == "__main__":
    audit_routes()
