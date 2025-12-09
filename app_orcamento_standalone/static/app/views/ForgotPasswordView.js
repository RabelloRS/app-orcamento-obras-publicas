import api from '../../js/api.js';

export default {
    template: `
        <div class="flex items-center justify-center h-full bg-gray-50">
            <div class="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
                <div class="text-center">
                    <h1 class="text-2xl font-bold text-gray-900">Recuperar Senha</h1>
                    <p class="text-sm text-gray-600">Informe seu email para receber um link de redefinição.</p>
                </div>
                <form @submit.prevent="submit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Email</label>
                        <input v-model="email" type="email" required class="w-full px-3 py-2 mt-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>

                    <div v-if="message" class="text-sm text-green-600 bg-green-100 p-2 rounded">
                        {{ message }}
                    </div>
                     <div v-if="error" class="text-sm text-red-600 bg-red-100 p-2 rounded">
                        {{ error }}
                    </div>

                    <button type="submit" :disabled="loading" class="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">
                        {{ loading ? 'Enviando...' : 'Enviar Email' }}
                    </button>

                    <div class="text-center text-sm">
                        <router-link to="/login" class="text-blue-600 hover:text-blue-800">Voltar para o Login</router-link>
                    </div>
                </form>
            </div>
        </div>
    `,
    data() {
        return {
            email: '',
            message: '',
            error: null,
            loading: false
        }
    },
    methods: {
        async submit() {
            this.loading = true;
            this.error = null;
            this.message = '';
            try {
                await api.post('/auth/forgot-password', { email: this.email });
                this.message = 'Se o email existir, um link de recuperação foi enviado.';
            } catch (err) {
                this.error = 'Erro ao processar solicitação.';
            } finally {
                this.loading = false;
            }
        }
    }
}
