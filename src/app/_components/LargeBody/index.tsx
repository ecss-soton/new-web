import React from 'react';

import classes from './index.module.scss';

export const LargeBody: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className={classes.largeBody}>{children}</p>;
