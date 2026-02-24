# Allka MVP - API REST Endpoints

## Autenticação
- `POST /api/auth/login` - Fazer login do usuário
- `POST /api/auth/logout` - Fazer logout do usuário
- `GET /api/auth/me` - Obter dados do usuário logado

## Usuários (Users)
- `GET /api/users` - Listar todos os usuários
- `GET /api/users/{id}` - Obter detalhes de um usuário específico
- `POST /api/users` - Criar um novo usuário
- `PUT /api/users/{id}` - Atualizar dados de um usuário
- `DELETE /api/users/{id}` - Deletar um usuário

## Clientes (Clients)
- `GET /api/clients` - Listar todos os clientes
- `GET /api/clients/{id}` - Obter detalhes de um cliente específico
- `POST /api/clients` - Criar um novo cliente
- `PUT /api/clients/{id}` - Atualizar dados de um cliente
- `DELETE /api/clients/{id}` - Deletar um cliente
- `GET /api/clients/{id}/projects` - Listar projetos de um cliente

## Projetos (Projects)
- `GET /api/projects` - Listar todos os projetos
- `GET /api/projects/{id}` - Obter detalhes de um projeto específico
- `POST /api/projects` - Criar um novo projeto
- `PUT /api/projects/{id}` - Atualizar dados de um projeto
- `DELETE /api/projects/{id}` - Deletar um projeto
- `GET /api/projects/{id}/tasks` - Listar tarefas de um projeto
- `PUT /api/projects/{id}/status` - Atualizar status de um projeto

## Tarefas (Tasks)
- `GET /api/tasks` - Listar todas as tarefas
- `GET /api/tasks/{id}` - Obter detalhes de uma tarefa específica
- `POST /api/tasks` - Criar uma nova tarefa
- `PUT /api/tasks/{id}` - Atualizar dados de uma tarefa
- `DELETE /api/tasks/{id}` - Deletar uma tarefa
- `PUT /api/tasks/{id}/status` - Atualizar status de uma tarefa
- `PUT /api/tasks/{id}/assign` - Atribuir tarefa a um usuário

## Dashboard
- `GET /api/dashboard/stats` - Obter estatísticas gerais (total de projetos, tarefas, clientes)
- `GET /api/dashboard/recent-activities` - Obter atividades recentes
- `GET /api/dashboard/my-tasks` - Obter tarefas atribuídas ao usuário logado

## Filtros e Busca
- `GET /api/projects?status=active&client_id=1` - Filtrar projetos por status e cliente
- `GET /api/tasks?status=pending&assigned_to=1` - Filtrar tarefas por status e responsável
- `GET /api/search?q=termo&type=projects` - Busca geral por projetos, clientes ou tarefas
