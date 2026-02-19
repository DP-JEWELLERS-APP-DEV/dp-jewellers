"use client";
import React from 'react';
import { Container, Typography, Box, Paper, Divider, List, ListItem, ListItemText } from '@mui/material';

export default function PrivacyPolicy() {
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1a1a1a' }}>
                        Privacy Policy
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Last Updated: February 19, 2026
                    </Typography>
                </Box>

                <Typography paragraph>
                    Welcome to <strong>DP Jewellers</strong>. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our application and tell you about your privacy rights and how the law protects you.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        1. Information We Collect
                    </Typography>
                    <Typography paragraph>
                        We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                    </Typography>
                    <List dense>
                        <ListItem>
                            <ListItemText
                                primary="Identity Data"
                                secondary="Includes first name, last name, username or similar identifier."
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Contact Data"
                                secondary="Includes billing address, delivery address, email address and telephone numbers (collected via OTP verification)."
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Financial Data"
                                secondary="We do not store your credit card or bank details. Payment processing is handled by our secure payment partner, Razorpay."
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Device Data"
                                secondary="Includes mobile device ID, model, operating system version, and other unique device identifiers."
                            />
                        </ListItem>
                    </List>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        2. How We Use Your Data
                    </Typography>
                    <Typography paragraph>
                        We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                    </Typography>
                    <List sx={{ listStyleType: 'disc', pl: 4 }}>
                        <ListItem sx={{ display: 'list-item' }}>
                            <ListItemText primary="To keycreate your account and verify your identity via OTP." />
                        </ListItem>
                        <ListItem sx={{ display: 'list-item' }}>
                            <ListItemText primary="To process and deliver your jewellery orders." />
                        </ListItem>
                        <ListItem sx={{ display: 'list-item' }}>
                            <ListItemText primary="To manage your relationship with us, including notifying you about changes to our terms or privacy policy." />
                        </ListItem>
                        <ListItem sx={{ display: 'list-item' }}>
                            <ListItemText primary="To administer and protect our business and this app." />
                        </ListItem>
                    </List>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        3. Data Security
                    </Typography>
                    <Typography paragraph>
                        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        4. Data Retention
                    </Typography>
                    <Typography paragraph>
                        We will only retain your personal data for as long as necessary to fulfil the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        5. Your Legal Rights
                    </Typography>
                    <Typography paragraph>
                        Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
                    </Typography>
                    <Typography paragraph>
                        If you wish to exercise any of the rights set out above, please contact us.
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        6. Payment & Refund Policy
                    </Typography>
                    <Typography paragraph>
                        <strong>Payments:</strong> All payments are processed securely through Razorpay. We do not store your card details or banking information on our servers.
                    </Typography>
                    <Typography paragraph>
                        <strong>Refunds & Cancellations:</strong>
                        <ul>
                            <li><strong>Cancellations:</strong> You can cancel your order before it has been shipped. Once shipped, orders cannot be cancelled.</li>
                            <li><strong>Returns:</strong> We accept returns for damaged or incorrect items reported within 24 hours of delivery. Please record an unboxing video as proof.</li>
                            <li><strong>Refunds:</strong> Approved refunds will be processed within 5-7 business days to the original payment method.</li>
                        </ul>
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        7. Contact Us
                    </Typography>
                    <Typography paragraph>
                        If you have any questions about this privacy policy, payment terms, or our practices, please contact us at:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        DP Jewellers Support
                    </Typography>
                    <Typography variant="body2">
                        Email: thedizilight@gmail.com
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
