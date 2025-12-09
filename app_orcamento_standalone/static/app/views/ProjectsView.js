import api from '../../js/api.js';

export default {
    template: `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-lg font-medium text-gray-900">Gerenciar Projetos</h2>
                <button @click="showModal = true" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                    Novo Projeto
                </button>
            </div>

            <!-- Project List -->
            <div class="bg-white shadow overflow-hidden sm:rounded-md">
                <ul v-if="projects.length > 0" class="divide-y divide-gray-200">
                    <li v-for="project in projects" :key="project.id">
                        <div class="px-4 py-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 cursor-pointer" @click="openProject(project)">
                            <div class="flex-1 truncate">
                                <div class="flex items-center justify-between">
                                    <p class="text-sm font-medium text-blue-600 truncate">{{ project.name }}</p>
                                    <div class="ml-2 flex-shrink-0 flex">
                                        <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Ativo</p>
                                    </div>
                                </div>
                                <div class="mt-2 sm:flex sm:justify-between">
                                    <div class="sm:flex">
                                        <p class="flex items-center text-sm text-gray-500">
                                            {{ project.description || 'Sem descrição' }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div class="ml-5 flex-shrink-0 flex space-x-2">
                                <button @click.stop="requestDelete(project)" class="text-red-600 hover:text-red-900 text-sm font-medium">Excluir</button>
                            </div>
                        </div>
                    </li>
                </ul>
                <div v-else class="p-4 text-center text-gray-500">
                    Nenhum projeto encontrado.
                </div>
            </div>

            <!-- Create Modal -->
            <div v-if="showModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showModal = false" aria-hidden="true"></div>
                    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">Novo Projeto</h3>
                            <div class="mt-4 space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Nome</label>
                                    <input v-model="newProject.name" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Descrição</label>
                                    <textarea v-model="newProject.description" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button @click="createProject" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                                Criar
                            </button>
                            <button @click="showModal = false" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `,
    data() {
        return {
            projects: [],
            showModal: false,
            newProject: {
                name: '',
                description: ''
            }
        }
    },
    mounted() {
        this.fetchProjects();
    },
    methods: {
        async fetchProjects() {
            try {
                const res = await api.get('/projects/');
                this.projects = res.data.items || [];
            } catch (err) {
                console.error("Failed to fetch projects", err);
            }
        },
        async createProject() {
            try {
                await api.post('/projects/', this.newProject);
                this.showModal = false;
                this.newProject.name = '';
                this.newProject.description = '';
                await this.fetchProjects();
            } catch (err) {
                alert('Erro ao criar projeto');
            }
        },
        openProject(project) {
            this.$router.push({ path: '/budgets', query: { projectId: project.id } });
        },
        async requestDelete(project) {
            const confirmMsg = `Deseja excluir o projeto "${project.name}"?`;
            if (!confirm(confirmMsg)) return;
            try {
                await api.delete(`/projects/${project.id}`);
                await this.fetchProjects();
            } catch (err) {
                alert('Erro ao deletar projeto');
            }
        }
    }
}
