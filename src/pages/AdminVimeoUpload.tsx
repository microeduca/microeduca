import Layout from '@/components/Layout';
import VimeoUpload from '@/components/admin/VimeoUpload';

export default function AdminVimeoUpload() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-poppins font-bold">Upload de Vídeo para o Vimeo</h1>
          <p className="text-muted-foreground">
            Envie vídeos diretamente para o Vimeo e incorpore no sistema
          </p>
        </div>
        <VimeoUpload />
      </div>
    </Layout>
  );
}


