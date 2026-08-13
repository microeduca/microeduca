import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface TrilhaItem {
  label: string;
  href?: string;
}

/**
 * Localiza o usuário dentro de Categoria › Módulo › Submódulo › Aula.
 * O documento da MICRO pede "facilitar a identificação da localização do
 * usuário dentro da estrutura de conteúdos".
 */
export default function CourseBreadcrumb({ itens }: { itens: TrilhaItem[] }) {
  if (itens.length === 0) return null;
  return (
    <nav aria-label="Trilha de navegação" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <li className="flex items-center">
          <Link to="/meus-cursos" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Meus Cursos</span>
          </Link>
        </li>
        {itens.map((item, i) => {
          const ultimo = i === itens.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
              <li className="min-w-0">
                {item.href && !ultimo ? (
                  <Link to={item.href} className="hover:text-foreground transition-colors truncate">
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={ultimo ? 'font-medium text-foreground truncate' : 'truncate'}
                    aria-current={ultimo ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
