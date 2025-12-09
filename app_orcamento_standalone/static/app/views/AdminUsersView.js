import api from '../../js/api.js';

export default {
    template: `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-lg font-medium text-gray-900">Gerenciar Usuários</h2>
                <button @click="showModal = true" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                    Adicionar Usuário
                </button>
            </div>

            <div class="bg-white shadow overflow-hidden sm:rounded-md">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" class="relative px-6 py-3">
                                <span class="sr-only">Editar</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-for="user in users" :key="user.id">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ user.full_name }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.email }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.role }}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                      :class="user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                                    {{ user.is_active ? 'Ativo' : 'Inativo' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button @click="toggleStatus(user)" class="text-indigo-600 hover:text-indigo-900 mr-4">
                                    {{ user.is_active ? 'Desativar' : 'Ativar' }}
                                </button>
                                <!-- Edit Role Button (Simple prompt for now) -->
                                <button @click="changeRole(user)" class="text-indigo-600 hover:text-indigo-900">Alterar Função</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Modal for New User -->
            <div v-if="showModal" class="fixed z-10 inset-0 overflow-y-auto" role="dialog">
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showModal = false"></div>
                    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                        <form @submit.prevent="createUser">
                            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 class="text-lg leading-6 font-medium text-gray-900">Novo Usuário</h3>
                                <div class="mt-4 space-y-4">
                                    <input v-model="newUser.full_name" type="text" placeholder="Nome Completo" required class="block w-full border border-gray-300 rounded-md py-2 px-3">
                                    <input v-model="newUser.email" type="email" placeholder="Email" required class="block w-full border border-gray-300 rounded-md py-2 px-3">
                                    <input v-model="newUser.password" type="password" placeholder="Senha Temporária" required class="block w-full border border-gray-300 rounded-md py-2 px-3">
                                    <select v-model="newUser.role" class="block w-full border border-gray-300 rounded-md py-2 px-3">
                                        <option value="USER">Usuário</option>
                                        <option value="EDITOR">Editor</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">
                                    Criar
                                </button>
                                <button type="button" @click="showModal = false" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            users: [],
            showModal: false,
            newUser: {
                full_name: '',
                email: '',
                password: '',
                role: 'USER'
            }
        }
    },
    mounted() {
        this.fetchUsers();
    },
    methods: {
        async fetchUsers() {
            try {
                const res = await api.get('/auth/users');
                this.users = res.data;
            } catch (err) {
                console.error("Failed to fetch users");
            }
        },
        async createUser() {
            try {
                await api.post('/auth/users', this.newUser);
                this.showModal = false;
                this.newUser = { full_name: '', email: '', password: '', role: 'USER' };
                this.fetchUsers();
            } catch (err) {
                alert(err.response?.data?.detail || 'Erro ao criar usuário');
            }
        },
        async toggleStatus(user) {
            try {
                await api.patch(`/auth/users/${user.id}`, { is_active: !user.is_active });

                this.fetchUsers();
            } catch (err) {
                alert('Erro ao atualizar status');
            }
        },
        async changeRole(user) {
            const newRole = prompt("Digite a nova função (USER, EDITOR, ADMIN, OWNER):", user.role);
            if (newRole && newRole !== user.role) {
                try {
                    await api.patch(`/auth/users/${user.id}`, { role: newRole });

                    this.fetchUsers();
                } catch (err) {
                    alert('Erro ao atualizar função');
                }
            }
        }
    }
}
