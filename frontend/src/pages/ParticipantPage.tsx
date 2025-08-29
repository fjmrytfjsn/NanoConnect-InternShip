/**
 * ParticipantPage - 参加者ページのメインコンテナ
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { JoinPresentation } from '@/components/participant/JoinPresentation';
import { ParticipantView } from '@/components/participant/ParticipantView';

/**
 * ParticipantPageコンポーネント
 */
export const ParticipantPage: React.FC = () => {
  const { accessCode } = useParams<{ accessCode?: string }>();

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Box>
        {!accessCode ? (
          <JoinPresentation />
        ) : (
          <ParticipantView accessCode={accessCode} />
        )}
      </Box>
    </Container>
  );
};

export default ParticipantPage;