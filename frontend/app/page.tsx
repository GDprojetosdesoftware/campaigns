import Image from "next/image";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-zinc-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4">
                    Chatwoot Campaign Manager
                </p>
            </div>

            <div className="relative flex place-items-center">
                <h1 className="text-4xl font-bold">Dashboard de Campanhas</h1>
            </div>

            <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
                <p>Pronto para iniciar seus disparos proativos.</p>
            </div>
        </main>
    );
}
