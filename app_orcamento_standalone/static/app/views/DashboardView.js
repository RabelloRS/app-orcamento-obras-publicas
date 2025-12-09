export default {
    template: `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Stats Cards -->
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-500">Projetos Ativos</p>
                        <p class="text-2xl font-semibold text-gray-900">--</p>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-green-100 text-green-600">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 36v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-500">Orçamentos</p>
                        <p class="text-2xl font-semibold text-gray-900">--</p>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 col-span-1 md:col-span-2 lg:col-span-3">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h3>
                <div class="flex flex-wrap gap-4">
                    <router-link to="/import" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        Importar SINAPI
                    </router-link>
                    <router-link to="/projects" class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        Novo Projeto
                    </router-link>
                </div>
            </div>

             <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 col-span-1 md:col-span-2 lg:col-span-3">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Bem vindo ao Portal Resolve Engenharia</h3>
                <p class="text-gray-600">Utilize o menu lateral para acessar os módulos do sistema.</p>
            </div>
        </div>
    `
}
