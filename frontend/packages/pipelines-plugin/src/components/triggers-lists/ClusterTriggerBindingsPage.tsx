import { useTranslation } from 'react-i18next';
import { DefaultPage } from '@console/internal/components/default-resource';
import { DocumentTitle } from '@console/shared/src/components/document-title/DocumentTitle';

const ClusterTriggerBindingsPage = (props) => {
  const { t } = useTranslation();
  return (
    <>
      <DocumentTitle>{t('pipelines-plugin~ClusterTriggerBindings')}</DocumentTitle>
      <DefaultPage {...props} />
    </>
  );
};

export default ClusterTriggerBindingsPage;
