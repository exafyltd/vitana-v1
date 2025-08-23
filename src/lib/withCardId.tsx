import React from 'react';

export interface CardIdProps {
  templateId?: string;
  systemCardId?: string;
  instanceId?: string;
  experimentId?: string;
}

export function withCardId<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  defaultTemplateId?: string,
  defaultSystemCardId?: string
) {
  const WithCardIdComponent = React.forwardRef<any, P & CardIdProps>((props, ref) => {
    const {
      templateId = defaultTemplateId,
      systemCardId = defaultSystemCardId,
      instanceId,
      experimentId,
      ...wrappedProps
    } = props;

    // Generate unique instance ID if not provided
    const finalInstanceId = instanceId || React.useMemo(() => 
      `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []
    );

    const dataAttributes: Record<string, string> = {};
    
    if (templateId) {
      dataAttributes['data-template-id'] = templateId;
    }
    
    if (systemCardId) {
      dataAttributes['data-system-card-id'] = systemCardId;
    }
    
    if (finalInstanceId) {
      dataAttributes['data-card-instance-id'] = finalInstanceId;
    }
    
    if (experimentId) {
      dataAttributes['data-experiment-id'] = experimentId;
    }

    return (
      <div {...dataAttributes} style={{ display: 'contents' }}>
        <WrappedComponent {...(wrappedProps as P)} ref={ref} />
      </div>
    );
  });

  WithCardIdComponent.displayName = `withCardId(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithCardIdComponent;
}

export default withCardId;