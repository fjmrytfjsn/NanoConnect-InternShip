import React from 'react';
import {
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Grid,
} from '@mui/material';
import { PlayCircleOutline, PersonAdd } from '@mui/icons-material';

export const HomePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h2" component="h1" gutterBottom align="center">
        NanoConnect へようこそ
      </Typography>

      <Typography
        variant="h6"
        component="p"
        align="center"
        color="text.secondary"
        mb={4}
      >
        リアルタイムインタラクティブプレゼンテーションを作成・参加できるプラットフォーム
      </Typography>

      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <PlayCircleOutline
                sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
              />
              <Typography variant="h5" component="h2" gutterBottom>
                プレゼンテーションを作成
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                インタラクティブなプレゼンテーションを作成して、リアルタイムでオーディエンスと交流しましょう
              </Typography>
              <Button variant="contained" fullWidth>
                作成を開始
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <PersonAdd
                sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }}
              />
              <Typography variant="h5" component="h2" gutterBottom>
                プレゼンテーションに参加
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                アクセスコードを入力してプレゼンテーションに参加し、リアルタイムで回答しましょう
              </Typography>
              <Button variant="outlined" fullWidth>
                参加する
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
