import api from '../../js/api.js';

export default {
    template: `
        <div class="flex items-center justify-center h-full bg-gray-50 overflow-y-auto">
            <div class="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md m-4">
                <div class="text-center">
                    <h1 class="text-2xl font-bold text-gray-900">Nova Conta</h1>
                    <p class="text-sm text-gray-600">Registre sua empresa</p>
                </div>
                <form @submit.prevent="register" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                        <input v-model="form.tenant_name" type="text" required class="w-full px-3 py-2 mt-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">CNPJ</label>
                        <input v-model="form.cnpj" type="text" required class="w-full px-3 py-2 mt-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Seu Nome</label>
                        <input v-model="form.full_name" type="text" required class="w-full px-3 py-2 mt-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Email</label>
                        <input v-model="form.email" type="email" required class="w-full px-3 py-2 mt-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Senha</label>
                        <input v-model="form.password" type="password" required class="w-full px-3 py-2 mt-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>

                    <div v-if="error" class="text-sm text-red-600 bg-red-100 p-2 rounded">
                        {{ error }}
                    </div>

                    <button type="submit" :disabled="loading" class="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">
                        {{ loading ? 'Registrando...' : 'Registrar' }}
                    </button>

                    <div class="text-center text-sm">
                        <router-link to="/login" class="text-blue-600 hover:text-blue-800">Já tem uma conta? Entrar</router-link>
                    </div>
                </form>
            </div>
        </div>
    `,
    data() {
        return {
            form: {
                tenant_name: '',
                cnpj: '',
                full_name: '',
                email: '',
                password: ''
            },
            error: null,
            loading: false
        }
    },
    methods: {
        async register() {
            this.loading = true;
            this.error = null;
            try {
                await api.post('/auth/register', this.form);
                alert('Registro realizado com sucesso! Faça login.');
                this.$router.push('/login');
            } catch (err) {
                this.error = err.response?.data?.detail || 'Erro ao registrar.';
            } finally {
                this.loading = false;
            }
        }
    }
}
